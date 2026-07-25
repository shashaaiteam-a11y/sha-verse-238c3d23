/**
 * PDF → reflowable book extractor.
 *
 * Runs incrementally (page by page) so the reader can start showing content
 * immediately while the rest of the book is still being processed. Heavy
 * parsing happens inside the pdf.js worker thread; the grouping heuristics
 * below are cheap and yield between pages so the UI stays at 60fps.
 */
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type {
  Block,
  Chapter,
  Direction,
  ReflowBook,
  ReflowBookMeta,
} from "./types";
import { REFLOW_MODEL_VERSION } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const CJK_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/;
const SENTENCE_END_RE = /[.!?"'”’)\]]\s*$|[۔।؟]\s*$/;
const BULLET_RE = /^\s*([•▪◦·–—*]|\(?\d{1,2}[.)]|[a-z]\))\s+/i;

export interface ExtractProgress {
  page: number;
  totalPages: number;
  /** Blocks produced for this page (already appended to `book.blocks`). */
  book: ReflowBook;
  done: boolean;
  ocrUsed: boolean;
}

interface Line {
  text: string;
  x: number;
  right: number;
  y: number;
  size: number;
  bold: boolean;
  italic: boolean;
  itemXs: number[];
}

const isRtl = (s: string) => RTL_RE.test(s);
const isCjk = (s: string) => CJK_RE.test(s);

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const yieldToUi = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

/** Group raw pdf.js text items into visual lines. */
function buildLines(items: any[]): Line[] {
  const raw = items
    .filter((it) => typeof it.str === "string" && it.str.length > 0)
    .map((it) => {
      const t = it.transform as number[];
      const size = Math.hypot(t[1], t[3]) || Math.abs(t[3]) || 10;
      const font = String(it.fontName || "");
      return {
        str: it.str as string,
        x: t[4] as number,
        y: t[5] as number,
        width: (it.width as number) || 0,
        size,
        bold: /bold|black|heavy|semibold/i.test(font),
        italic: /italic|oblique/i.test(font),
      };
    });

  if (!raw.length) return [];

  const buckets: (typeof raw)[] = [];
  const sorted = [...raw].sort((a, b) => b.y - a.y);
  let current: typeof raw = [];
  let currentY = sorted[0].y;

  for (const item of sorted) {
    const tolerance = Math.max(item.size * 0.5, 2);
    if (Math.abs(item.y - currentY) <= tolerance) {
      current.push(item);
    } else {
      if (current.length) buckets.push(current);
      current = [item];
      currentY = item.y;
    }
  }
  if (current.length) buckets.push(current);

  return buckets.map((bucket) => {
    const ordered = [...bucket].sort((a, b) => a.x - b.x);
    let text = "";
    let prev: (typeof ordered)[number] | null = null;
    for (const item of ordered) {
      if (prev) {
        const gap = item.x - (prev.x + prev.width);
        const needsSpace =
          gap > prev.size * 0.18 &&
          !/\s$/.test(text) &&
          !/^\s/.test(item.str) &&
          !isCjk(item.str);
        if (needsSpace) text += " ";
      }
      text += item.str;
      prev = item;
    }
    const sizes = ordered.map((i) => i.size);
    const last = ordered[ordered.length - 1];
    return {
      text: text.replace(/\s+/g, " ").trim(),
      x: ordered[0].x,
      right: last.x + last.width,
      y: ordered[0].y,
      size: median(sizes),
      bold: ordered.filter((i) => i.bold).length > ordered.length / 2,
      italic: ordered.filter((i) => i.italic).length > ordered.length / 2,
      itemXs: ordered.map((i) => i.x),
    };
  }).filter((l) => l.text.length > 0);
}

/**
 * Detect a two-column layout and return lines in true reading order.
 * Falls back to the original order for single-column pages.
 */
function orderColumns(lines: Line[], pageWidth: number): Line[] {
  if (lines.length < 8) return lines;
  const mid = pageWidth / 2;
  const left = lines.filter((l) => l.right <= mid + pageWidth * 0.04);
  const right = lines.filter((l) => l.x >= mid - pageWidth * 0.04);
  const covered = left.length + right.length;
  // Both columns must be substantial and account for nearly all lines.
  if (
    covered < lines.length * 0.9 ||
    left.length < lines.length * 0.3 ||
    right.length < lines.length * 0.3
  ) {
    return lines;
  }
  return [...left, ...right];
}

/** Detect rows that look like a table (3+ aligned columns over 3+ rows). */
function detectTable(lines: Line[], startIndex: number): { rows: string[][]; consumed: number } | null {
  const candidate: Line[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const gaps = line.itemXs
      .slice(1)
      .map((x, idx) => x - line.itemXs[idx])
      .filter((g) => g > line.size * 2.5);
    if (gaps.length >= 2 && line.text.length < 200) candidate.push(line);
    else break;
  }
  if (candidate.length < 3) return null;

  const columnAnchors = candidate[0].itemXs.filter((x, idx, arr) =>
    idx === 0 || x - arr[idx - 1] > candidate[0].size * 2.5
  );
  const rows = candidate.map((line) =>
    line.text.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean)
  );
  const width = Math.max(...rows.map((r) => r.length));
  if (width < 2 || columnAnchors.length < 2) return null;
  return {
    rows: rows.map((r) => [...r, ...Array(width - r.length).fill("")]),
    consumed: candidate.length,
  };
}

function joinLines(parts: Line[]): string {
  let text = "";
  for (const part of parts) {
    const chunk = part.text;
    if (!text) {
      text = chunk;
      continue;
    }
    if (/[-\u2010\u00AD]$/.test(text) && /^[a-zà-öø-ÿ]/.test(chunk)) {
      // Hyphenated word split across lines → rejoin.
      text = text.replace(/[-\u2010\u00AD]$/, "") + chunk;
    } else if (isCjk(text.slice(-1)) && isCjk(chunk.slice(0, 1))) {
      text += chunk;
    } else {
      text += " " + chunk;
    }
  }
  return text.replace(/\s+/g, " ").trim();
}

interface GroupContext {
  bodySize: number;
  bodySamples: number[];
}

/** Merge visual lines into semantic blocks (headings, paragraphs, tables, lists). */
function linesToBlocks(
  lines: Line[],
  page: number,
  ctx: GroupContext,
  nextId: () => string
): Block[] {
  const blocks: Block[] = [];
  if (!lines.length) return blocks;

  ctx.bodySamples.push(...lines.map((l) => l.size));
  if (ctx.bodySamples.length > 4000) ctx.bodySamples.splice(0, ctx.bodySamples.length - 4000);
  ctx.bodySize = median(ctx.bodySamples) || lines[0].size;

  const lineGaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    if (gap > 0) lineGaps.push(gap);
  }
  const baseGap = median(lineGaps) || ctx.bodySize * 1.2;
  const columnRight = Math.max(...lines.map((l) => l.right));
  const columnLeft = Math.min(...lines.map((l) => l.x));
  const columnWidth = Math.max(columnRight - columnLeft, 1);

  const flush = (group: Line[]) => {
    if (!group.length) return;
    const text = joinLines(group);
    if (!text) return;
    const dir: Direction = isRtl(text) ? "rtl" : "ltr";
    const size = median(group.map((l) => l.size));
    const bold = group.filter((l) => l.bold).length > group.length / 2;
    const ratio = ctx.bodySize > 0 ? size / ctx.bodySize : 1;
    const short = text.length <= 140 && group.length <= 3;

    const isHeading =
      short &&
      (ratio >= 1.18 || (bold && ratio >= 1.02)) &&
      !/[.,;:]$/.test(text);

    if (isHeading) {
      const level: 1 | 2 | 3 = ratio >= 1.7 ? 1 : ratio >= 1.32 ? 2 : 3;
      blocks.push({ id: nextId(), page, type: "heading", level, text, dir });
      return;
    }

    const small = ratio <= 0.82;
    const quote =
      !small &&
      group.every((l) => l.x > columnLeft + columnWidth * 0.08) &&
      group.every((l) => l.right < columnRight - columnWidth * 0.05) &&
      group.length >= 2;

    blocks.push({
      id: nextId(),
      page,
      type: "paragraph",
      text,
      dir,
      indent: group[0].x > columnLeft + ctx.bodySize * 0.8,
      quote: quote || undefined,
      small: small || undefined,
    });
  };

  let group: Line[] = [];
  for (let i = 0; i < lines.length; i++) {
    const table = detectTable(lines, i);
    if (table) {
      flush(group);
      group = [];
      blocks.push({ id: nextId(), page, type: "table", rows: table.rows });
      i += table.consumed - 1;
      continue;
    }

    const line = lines[i];
    const prev = lines[i - 1];
    if (!prev) {
      group = [line];
      continue;
    }

    const gap = prev.y - line.y;
    const bigGap = gap > baseGap * 1.55 || gap < 0;
    const sizeShift = Math.abs(line.size - prev.size) > Math.max(prev.size * 0.16, 0.9);
    const indentStart = line.x > prev.x + Math.max(line.size * 0.7, 4);
    const prevShort = prev.right < columnRight - columnWidth * 0.14;
    const sentenceBreak = prevShort && SENTENCE_END_RE.test(prev.text);
    const bulletStart = BULLET_RE.test(line.text);

    if (bigGap || sizeShift || indentStart || sentenceBreak || bulletStart) {
      flush(group);
      group = [line];
    } else {
      group.push(line);
    }
  }
  flush(group);

  return blocks;
}

async function extractPageImages(
  page: any,
  pageNumber: number,
  nextId: () => string
): Promise<Block[]> {
  const blocks: Block[] = [];
  try {
    const ops = await page.getOperatorList();
    const names: string[] = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (
        ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject ||
        ops.fnArray[i] === pdfjsLib.OPS.paintJpegXObject
      ) {
        const name = ops.argsArray[i]?.[0];
        if (typeof name === "string" && !names.includes(name)) names.push(name);
      }
    }

    for (const name of names.slice(0, 6)) {
      const img: any = await new Promise((resolve) => {
        try {
          if (page.objs.has(name)) resolve(page.objs.get(name));
          else page.objs.get(name, resolve);
        } catch {
          resolve(null);
        }
      });
      if (!img || !img.width || !img.height) continue;
      // Skip tiny decorative artwork, rules and background tiles.
      if (img.width < 120 || img.height < 120) continue;

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) continue;

      if (img.bitmap) {
        ctx2d.drawImage(img.bitmap, 0, 0);
      } else if (img.data) {
        const imageData = ctx2d.createImageData(img.width, img.height);
        const src = img.data as Uint8ClampedArray;
        const dst = imageData.data;
        if (src.length === img.width * img.height * 4) {
          dst.set(src);
        } else if (src.length === img.width * img.height * 3) {
          for (let p = 0, q = 0; p < src.length; p += 3, q += 4) {
            dst[q] = src[p];
            dst[q + 1] = src[p + 1];
            dst[q + 2] = src[p + 2];
            dst[q + 3] = 255;
          }
        } else {
          continue;
        }
        ctx2d.putImageData(imageData, 0, 0);
      } else {
        continue;
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.82)
      );
      if (!blob) continue;
      blocks.push({
        id: nextId(),
        page: pageNumber,
        type: "image",
        blob,
        width: img.width,
        height: img.height,
        alt: `Illustration from page ${pageNumber}`,
      });
    }
  } catch {
    // Image extraction is best-effort — never block text extraction.
  }
  return blocks;
}

/** Render a page to a Blob (used as fallback for scanned pages). */
async function renderPageToBlob(page: any, targetWidth = 1400): Promise<{ blob: Blob; width: number; height: number } | null> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.4, Math.max(1, targetWidth / base.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) return null;
  await page.render({ canvasContext: context, viewport, canvas }).promise;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.85)
  );
  return blob ? { blob, width: canvas.width, height: canvas.height } : null;
}

export interface ExtractOptions {
  bookId: string;
  title?: string;
  author?: string;
  /** Run OCR on pages that contain no extractable text. Loaded lazily. */
  ocr?: boolean;
  ocrLanguage?: string;
  signal?: AbortSignal;
}

/**
 * Incrementally converts a PDF into the internal reflowable model.
 * Yields after every page so callers can render progressively.
 */
export async function* extractReflowBook(
  url: string,
  options: ExtractOptions
): AsyncGenerator<ExtractProgress> {
  const loadingTask = pdfjsLib.getDocument({
    url,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    disableStream: false,
    disableAutoFetch: true,
    rangeChunkSize: 262144,
    withCredentials: false,
  });
  const pdf = await loadingTask.promise;

  let counter = 0;
  const nextId = () => `b${counter++}`;
  const ctx: GroupContext = { bodySize: 12, bodySamples: [] };

  let info: any = {};
  try {
    info = (await pdf.getMetadata())?.info ?? {};
  } catch {
    /* metadata is optional */
  }

  const meta: ReflowBookMeta = {
    title: options.title || info.Title || undefined,
    author: options.author || info.Author || undefined,
    language: info.Language || undefined,
    totalPages: pdf.numPages,
    scanned: false,
    dir: "ltr",
  };

  const book: ReflowBook = {
    version: REFLOW_MODEL_VERSION,
    bookId: options.bookId,
    meta,
    blocks: [],
    chapters: [],
  };

  // Seed chapters from the PDF outline when available (most accurate).
  const outlinePages = new Map<number, string>();
  try {
    const outline = await pdf.getOutline();
    if (outline?.length) {
      const walk = async (items: any[], level: number) => {
        for (const item of items) {
          try {
            const dest =
              typeof item.dest === "string" ? await pdf.getDestination(item.dest) : item.dest;
            if (dest?.[0]) {
              const pageIndex = await pdf.getPageIndex(dest[0]);
              if (!outlinePages.has(pageIndex + 1)) {
                outlinePages.set(pageIndex + 1, item.title);
              }
              book.chapters.push({
                id: `c${book.chapters.length}`,
                title: item.title,
                blockIndex: -1,
                page: pageIndex + 1,
                level,
              });
            }
          } catch {
            /* skip unresolvable outline entries */
          }
          if (item.items?.length && level < 2) await walk(item.items, level + 1);
        }
      };
      await walk(outline, 0);
    }
  } catch {
    /* outline is optional */
  }

  let ocrUsed = false;
  let ocrWorker: { recognize: (img: Blob) => Promise<string[]> } | null = null;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    if (options.signal?.aborted) return;

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    let lines = buildLines(content.items as any[]);
    lines = orderColumns(lines, viewport.width);

    // Drop running headers / footers (single short line at the page extremes).
    lines = lines.filter((line, index) => {
      const nearEdge = line.y > viewport.height * 0.94 || line.y < viewport.height * 0.06;
      const looksLikeFolio = /^[ivxlcdm\d\s\-—–.]+$/i.test(line.text) && line.text.length <= 12;
      return !(nearEdge && (looksLikeFolio || (index === 0 && line.text.length < 60 && lines.length > 4)));
    });

    const plainText = lines.map((l) => l.text).join("").trim();
    const startIndex = book.blocks.length;

    if (plainText.length < 12) {
      // Scanned / image-only page.
      meta.scanned = true;
      const rendered = await renderPageToBlob(page);
      let recognised = false;

      if (options.ocr && rendered) {
        try {
          if (!ocrWorker) {
            const { createOcrWorker } = await import("./ocr");
            ocrWorker = await createOcrWorker(options.ocrLanguage || "eng");
          }
          const paragraphs = await ocrWorker.recognize(rendered.blob);
          if (paragraphs.length) {
            ocrUsed = true;
            recognised = true;
            for (const text of paragraphs) {
              const clean = text.replace(/\s+/g, " ").trim();
              if (clean.length < 2) continue;
              book.blocks.push({
                id: nextId(),
                page: pageNumber,
                type: "paragraph",
                text: clean,
                dir: isRtl(clean) ? "rtl" : "ltr",
              });
            }
          }
        } catch {
          /* OCR is best-effort */
        }
      }

      if (!recognised && rendered) {
        book.blocks.push({
          id: nextId(),
          page: pageNumber,
          type: "image",
          blob: rendered.blob,
          width: rendered.width,
          height: rendered.height,
          alt: `Scanned page ${pageNumber}`,
        });
      }
    } else {
      const outlineTitle = outlinePages.get(pageNumber);
      const textBlocks = linesToBlocks(lines, pageNumber, ctx, nextId);
      const imageBlocks = await extractPageImages(page, pageNumber, nextId);

      if (outlineTitle && !textBlocks.some((b) => b.type === "heading" && b.text === outlineTitle)) {
        book.blocks.push({
          id: nextId(),
          page: pageNumber,
          type: "heading",
          level: 1,
          text: outlineTitle,
          dir: isRtl(outlineTitle) ? "rtl" : "ltr",
        });
      }
      book.blocks.push(...textBlocks, ...imageBlocks);
    }

    book.blocks.push({ id: nextId(), page: pageNumber, type: "pagebreak" });

    // Bind outline chapters to concrete block indices.
    for (const chapter of book.chapters) {
      if (chapter.blockIndex === -1 && chapter.page === pageNumber) {
        chapter.blockIndex = startIndex;
      }
    }

    if (book.blocks.some((b) => b.type !== "pagebreak" && (b as any).dir === "rtl")) {
      meta.dir = "rtl";
    }

    page.cleanup();
    yield { page: pageNumber, totalPages: pdf.numPages, book, done: false, ocrUsed };
    await yieldToUi();
  }

  // Fall back to detected headings when the PDF has no outline.
  if (!book.chapters.length) {
    book.blocks.forEach((block, index) => {
      if (block.type === "heading" && block.level <= 2) {
        book.chapters.push({
          id: `c${book.chapters.length}`,
          title: block.text,
          blockIndex: index,
          page: block.page,
          level: block.level - 1,
        });
      }
    });
  }
  book.chapters = book.chapters.filter((c) => c.blockIndex >= 0);

  try {
    await pdf.destroy();
  } catch {
    /* ignore */
  }

  yield { page: pdf.numPages, totalPages: pdf.numPages, book, done: true, ocrUsed };
}
