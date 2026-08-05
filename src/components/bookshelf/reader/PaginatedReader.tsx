/**
 * PaginatedReader — production-grade paginated ebook renderer (Bookshelf only).
 *
 * Uses real CSS multi-column pagination (the same technique Play Books / epub.js
 * use): the content flows into viewport-sized columns and we translate
 * horizontally one column at a time. No vertical scrolling while reading, real
 * text reflow on every typography change, images never cropped, and only the
 * current section of the book is mounted so memory stays flat.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Highlighter, StickyNote, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block, Highlight, ImageBlock, ReflowBook } from "@/lib/reader/types";
import { isHiddenMetadata, normalizeReaderText } from "@/lib/reader/sanitize";
import { isBoilerplate, isGarbageLine } from "@/lib/reader/quality";

import {
  READER_FONT_STACKS,
  READER_THEMES,
  type ReaderSettings,
} from "@/lib/reader/settings";

export interface ReaderLocation {
  blockIndex: number;
  blockId: string;
  page: number;
  percent: number;
  snippet: string;
}

export interface PaginationInfo {
  page: number;
  totalPages: number;
  percent: number;
  chapterTitle: string;
}

interface Props {
  book: ReflowBook;
  settings: ReaderSettings;
  highlights: Highlight[];
  searchQuery?: string;
  jumpTo?: { blockIndex: number; token: number } | null;
  /** Imperative page flip request from external controls. */
  navRequest?: { delta: number; token: number } | null;
  coverUrl?: string | null;
  title?: string;
  author?: string;
  onLocationChange?: (location: ReaderLocation) => void;
  onPaginationChange?: (info: PaginationInfo) => void;
  onCreateHighlight?: (payload: {
    blockId: string;
    start: number;
    end: number;
    text: string;
    withNote: boolean;
  }) => void;
  onTap?: () => void;
  className?: string;
}

const MARGIN_STEPS = [16, 26, 40, 60];
const MAX_CONTENT_WIDTH = [760, 700, 640, 580];
const COLUMN_GAP = 48;
/** Approximate blocks per rendered section when the book has no chapters. */
const FALLBACK_SECTION_SIZE = 60;

/* ------------------------------- text pieces ------------------------------- */

interface TextRange {
  start: number;
  end: number;
  kind: "highlight" | "search";
  color?: string;
  id?: string;
}

function segmentText(text: string, ranges: TextRange[]) {
  if (!ranges.length) return [{ text, range: null as TextRange | null }];
  const bounds = new Set<number>([0, text.length]);
  ranges.forEach((r) => {
    bounds.add(Math.max(0, Math.min(text.length, r.start)));
    bounds.add(Math.max(0, Math.min(text.length, r.end)));
  });
  const points = [...bounds].sort((a, b) => a - b);
  const out: { text: string; range: TextRange | null }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;
    const hit =
      ranges.find((r) => r.kind === "search" && r.start <= start && r.end >= end) ??
      ranges.find((r) => r.start <= start && r.end >= end) ??
      null;
    out.push({ text: text.slice(start, end), range: hit });
  }
  return out;
}

function findSearchRanges(text: string, query: string): TextRange[] {
  if (!query || query.trim().length < 2) return [];
  const needle = query.trim().toLowerCase();
  const haystack = text.toLowerCase();
  const out: TextRange[] = [];
  let from = 0;
  while (out.length < 40) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    out.push({ start: index, end: index + needle.length, kind: "search" });
    from = index + needle.length;
  }
  return out;
}

const TextContent = ({ text, ranges }: { text: string; ranges: TextRange[] }) => (
  <>
    {segmentText(text, ranges).map((segment, index) =>
      segment.range ? (
        <mark
          key={index}
          data-highlight-id={segment.range.id}
          style={{
            backgroundColor:
              segment.range.kind === "search"
                ? "rgba(255, 213, 79, 0.85)"
                : segment.range.color || "rgba(255, 235, 59, 0.42)",
            color: "inherit",
            borderRadius: 2,
            padding: "0 1px",
          }}
        >
          {segment.text}
        </mark>
      ) : (
        <span key={index}>{segment.text}</span>
      )
    )}
  </>
);

const ImageContent = ({ block, onReady }: { block: ImageBlock; onReady?: () => void }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(block.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [block.blob]);

  return (
    <figure
      style={{
        margin: "1.2em 0",
        textAlign: "center",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      {src && (
        <img
          src={src}
          alt={block.alt || ""}
          decoding="async"
          loading="lazy"
          onLoad={onReady}
          onError={onReady}
          style={{
            display: "inline-block",
            maxWidth: "100%",
            // Percentages resolve against an auto-height figure (i.e. not at
            // all), which let tall images overflow the column and clip. The
            // page height is published as a CSS var by the column container.
            maxHeight: "calc(var(--reader-page-h, 70vh) * 0.72)",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            borderRadius: 6,
          }}
        />
      )}
    </figure>
  );
};


/* --------------------------------- blocks --------------------------------- */

const BlockView = memo(
  ({
    block,
    settings,
    highlights,
    searchQuery,
    onImageReady,
  }: {
    block: Block;
    settings: ReaderSettings;
    highlights: Highlight[];
    searchQuery?: string;
    onImageReady?: () => void;
  }) => {
    const theme = READER_THEMES[settings.theme];

    if (block.type === "pagebreak") {
      return <div aria-hidden style={{ height: settings.fontSize * 0.5 }} />;
    }

    if (block.type === "image") {
      return <ImageContent block={block} onReady={onImageReady} />;
    }

    if (block.type === "table") {
      return (
        <div style={{ margin: "1em 0", breakInside: "avoid" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              tableLayout: "fixed",
              fontSize: `${settings.fontSize * 0.84}px`,
              lineHeight: 1.4,
            }}
          >
            <tbody>
              {block.rows.map((row, rIndex) => (
                <tr key={rIndex}>
                  {row.map((cell, cIndex) => (
                    <td
                      key={cIndex}
                      style={{
                        border: `1px solid ${theme.muted}44`,
                        padding: "5px 8px",
                        verticalAlign: "top",
                        overflowWrap: "break-word",
                        fontWeight: rIndex === 0 ? 600 : 400,
                      }}
                    >
                      {normalizeReaderText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const text = block.text;
    // `highlights` is already scoped to this block by the parent, so memoised
    // blocks no longer re-render when an unrelated highlight is added.
    const ranges: TextRange[] = [
      ...highlights.map<TextRange>((h) => ({
        start: h.start,
        end: h.end,
        kind: "highlight",
        color: h.color,
        id: h.id,
      })),
      ...findSearchRanges(text, searchQuery ?? ""),
    ];


    if (block.type === "heading") {
      const scale = block.level === 1 ? 1.5 : block.level === 2 ? 1.28 : 1.12;
      const Tag = `h${Math.min(block.level + 1, 4)}` as "h2" | "h3" | "h4";
      return (
        <Tag
          data-block-id={block.id}
          dir={block.dir}
          style={{
            fontSize: `${settings.fontSize * scale}px`,
            lineHeight: 1.3,
            fontWeight: 700,
            margin: `${settings.fontSize * 0.9}px 0 ${settings.fontSize * 0.4}px`,
            letterSpacing: "-0.01em",
            breakAfter: "avoid",
            breakInside: "avoid",
            overflowWrap: "break-word",
          }}
        >
          <TextContent text={text} ranges={ranges} />
        </Tag>
      );
    }

    return (
      <p
        data-block-id={block.id}
        dir={block.dir}
        style={{
          fontSize: `${settings.fontSize * (block.small ? 0.85 : 1)}px`,
          lineHeight: settings.lineHeight,
          margin: `0 0 ${settings.fontSize * settings.paragraphSpacing}px`,
          textIndent: block.indent && !block.quote ? "1.3em" : undefined,
          textAlign: settings.justify && !block.quote ? "justify" : "start",
          hyphens: settings.justify ? "auto" : undefined,
          letterSpacing: settings.looseSpacing ? "0.02em" : undefined,
          wordSpacing: settings.looseSpacing ? "0.1em" : undefined,
          paddingInlineStart: block.quote ? "1em" : undefined,
          borderInlineStart: block.quote ? `3px solid ${theme.muted}66` : undefined,
          fontStyle: block.quote ? "italic" : undefined,
          color: block.small ? theme.muted : undefined,
          overflowWrap: "break-word",
          orphans: 2,
          widows: 2,
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <TextContent text={text} ranges={ranges} />
      </p>
    );
  }
);
BlockView.displayName = "BlockView";

/* ------------------------------- page mode -------------------------------- */

/**
 * PageImage — Page Mode renderer for rasterised original pages (scanned books,
 * broken font mappings, comics). The page is always fitted inside the viewport
 * with its aspect ratio preserved: never cropped, never stretched.
 *
 * Zoom: ctrl/⌘ + wheel, trackpad pinch and double tap. Panning is enabled once
 * zoomed in; page flips are suppressed while zoomed so gestures never conflict.
 */
const PageImage = ({
  block,
  label,
  onZoomChange,
}: {
  block: ImageBlock;
  label: string;
  onZoomChange?: (zoomed: boolean) => void;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(block.blob);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [block.blob]);

  useEffect(() => onZoomChange?.(zoom > 1.01), [zoom, onZoomChange]);

  // Anchored zoom around the pointer. Native non-passive listener because
  // React's onWheel is passive and cannot preventDefault().
  const zoomRef = useRef({ zoom, offset });
  zoomRef.current = { zoom, offset };

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const state = zoomRef.current;
      const next = Math.min(5, Math.max(1, state.zoom * Math.exp(-dy * 0.0018)));
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      const k = next / state.zoom;
      setZoom(next);
      setOffset(
        next <= 1.001
          ? { x: 0, y: 0 }
          : { x: px - (px - state.offset.x) * k, y: py - (py - state.offset.y) * k }
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const toggleZoom = () => {
    if (zoom > 1.01) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  };

  return (
    <div
      ref={hostRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{ touchAction: zoom > 1.01 ? "none" : undefined, cursor: zoom > 1.01 ? "grab" : undefined }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        toggleZoom();
      }}
      onPointerDown={(event) => {
        if (zoom <= 1.01) return;
        dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) return;
        setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onClick={(event) => {
        // Tapping a zoomed page pans/does nothing; unzoomed it toggles controls.
        if (zoom > 1.01) event.stopPropagation();
      }}
    >
      {src && (
        <img
          src={src}
          alt={block.alt || label}
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragRef.current ? "none" : "transform 160ms ease-out",
            userSelect: "none",
          }}
        />
      )}
    </div>
  );
};

/* -------------------------------- sections -------------------------------- */

interface Section {
  /** `page` = rasterised original page rendered in Page Mode. */
  kind: "cover" | "content" | "page";
  /** Indices refer to the sanitised block list. */
  blocks: Block[];
  startIndex: number;
  title: string;
  chars: number;
}


function offsetWithin(root: HTMLElement, node: Node, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return total;
}

const PaginatedReader = ({
  book,
  settings,
  highlights,
  searchQuery,
  jumpTo,
  navRequest,
  coverUrl,
  title,
  author,
  onLocationChange,
  onPaginationChange,
  onCreateHighlight,
  onTap,
  className,
}: Props) => {
  const theme = READER_THEMES[settings.theme];
  const viewportRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [sectionIndex, setSectionIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const pendingEdgeRef = useRef<"start" | "end">("start");
  const pendingBlockRef = useRef<string | null>(null);
  const measuredRef = useRef<Map<number, number>>(new Map());
  const [measuredVersion, setMeasuredVersion] = useState(0);

  const [selection, setSelection] = useState<{
    blockId: string;
    start: number;
    end: number;
    text: string;
    top: number;
    left: number;
  } | null>(null);

  /* --- sanitise blocks once per book revision -----------------------------
   * Second line of defence (older cached books were extracted before the
   * quality gate existed): repairs Unicode, then drops PDF metadata, glyph
   * soup and distributor boilerplate so only real book content can render.  */
  const blocks = useMemo(() => {
    const out: Block[] = [];
    for (const raw of book.blocks) {
      if (raw.type === "paragraph" || raw.type === "heading") {
        const text = normalizeReaderText(raw.text);
        if (!text || isHiddenMetadata(text) || isBoilerplate(text) || isGarbageLine(text)) continue;
        out.push({ ...raw, text });
      } else {
        out.push(raw);
      }
    }
    return out;
  }, [book.blocks]);

  /* --- sections: cover + chapter (or chunked) sections + full-page images ---
   * Rendering strategy is chosen per section:
   *   cover   → title card
   *   content → Reflow Mode (CSS multi-column pagination)
   *   page    → Page Mode (fitted image of the original page)                */
  const sections = useMemo<Section[]>(() => {
    const list: Section[] = [
      {
        kind: "cover",
        blocks: [],
        startIndex: 0,
        title: title || book.meta.title || "",
        chars: 0,
      },
    ];

    const boundaries: number[] = [];
    if (book.chapters.length > 1) {
      const idSet = new Set(blocks.map((b) => b.id));
      book.chapters.forEach((chapter) => {
        const original = book.blocks[chapter.blockIndex];
        if (!original || !idSet.has(original.id)) return;
        const index = blocks.findIndex((b) => b.id === original.id);
        if (index > 0) boundaries.push(index);
      });
    }
    if (!boundaries.length) {
      for (let i = FALLBACK_SECTION_SIZE; i < blocks.length; i += FALLBACK_SECTION_SIZE) {
        boundaries.push(i);
      }
    }

    const starts = [0, ...boundaries.filter((v, i, arr) => arr.indexOf(v) === i)].sort(
      (a, b) => a - b
    );

    const pushContent = (slice: Block[], start: number) => {
      const meaningful = slice.filter((b) => b.type !== "pagebreak");
      if (!meaningful.length) return;
      const head = slice.find((b) => b.type === "heading");
      list.push({
        kind: "content",
        blocks: slice,
        startIndex: start,
        title: head && "text" in head ? head.text : "",
        chars: slice.reduce((sum, b) => sum + ("text" in b ? b.text.length : 120), 0),
      });
    };

    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1] : blocks.length;
      if (end <= start) continue;

      // A rasterised original page always occupies a page of its own; it is
      // never mixed into the reflowed column stream.
      let runStart = start;
      let run: Block[] = [];
      for (let index = start; index < end; index++) {
        const block = blocks[index];
        if (block.type === "image" && block.fullPage) {
          pushContent(run, runStart);
          run = [];
          runStart = index + 1;
          list.push({
            kind: "page",
            blocks: [block],
            startIndex: index,
            title: "",
            chars: 900,
          });
        } else {
          run.push(block);
        }
      }
      pushContent(run, runStart);
    }
    return list;
  }, [blocks, book.blocks, book.chapters, book.meta.title, title]);


  const activeSection = sections[Math.min(sectionIndex, sections.length - 1)] ?? sections[0];

  /* ------------------------------ measurement ----------------------------- */
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const apply = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1
          ? prev
          : { width: rect.width, height: rect.height }
      );
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnWidth = Math.max(size.width - 2 * (MARGIN_STEPS[settings.margin] ?? 26), 100);
  const step = columnWidth + COLUMN_GAP;

  const isPageMode = activeSection?.kind === "page";
  const isCoverSection = activeSection?.kind === "cover";

  /** Block at the start of the visible column — the reflow anchor that keeps
   *  the reader on the same sentence when typography or geometry changes. */
  const currentBlockIdRef = useRef<string | null>(null);
  const pageRef = useRef(0);
  pageRef.current = page;
  const pageCountRef = useRef(1);
  pageCountRef.current = pageCount;

  const remeasure = useCallback(() => {
    // Cover and Page Mode sections are exactly one page — nothing to measure.
    if (isPageMode || isCoverSection) {
      measuredRef.current.set(sectionIndex, 1);
      setMeasuredVersion((v) => v + 1);
      setPageCount(1);
      pendingBlockRef.current = null;
      pendingEdgeRef.current = "start";
      setPage(0);
      return;
    }
    const inner = columnsRef.current;
    if (!inner || columnWidth <= 0) return;

    // N columns span N*columnWidth + (N-1)*gap, so add one gap back before
    // dividing. Without this the last page could be rounded away (blank/lost).
    const count = Math.max(1, Math.round((inner.scrollWidth + COLUMN_GAP) / step));
    measuredRef.current.set(sectionIndex, count);
    setMeasuredVersion((v) => v + 1);
    setPageCount(count);

    // Explicit jump target wins; otherwise stay anchored to the block the
    // reader was already looking at (zero jump on font/margin/rotate).
    const anchorId = pendingBlockRef.current ?? currentBlockIdRef.current;
    pendingBlockRef.current = null;
    if (anchorId) {
      const target = inner.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(anchorId)}"]`);
      if (target) {
        setPage(Math.max(0, Math.min(count - 1, Math.round(target.offsetLeft / step))));
        return;
      }
    }
    setPage((prev) => {
      if (pendingEdgeRef.current === "end") {
        pendingEdgeRef.current = "start";
        return count - 1;
      }
      return Math.min(prev, count - 1);
    });
  }, [columnWidth, sectionIndex, step, isPageMode, isCoverSection]);

  // Re-paginate whenever geometry, typography or content changes.
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(remeasure);
    return () => cancelAnimationFrame(raf);
  }, [
    remeasure,
    activeSection,
    size.width,
    size.height,
    settings.fontSize,
    settings.lineHeight,
    settings.font,
    settings.margin,
    settings.paragraphSpacing,
    settings.justify,
    settings.looseSpacing,
    searchQuery,
    highlights.length,
  ]);

  /* ------------------------------- navigation ----------------------------- */
  // Side effects never run inside a state updater (that would double-fire in
  // StrictMode); page/section are read from refs instead.
  const flip = useCallback(
    (delta: number) => {
      if (!delta) return;
      const count = pageCountRef.current;
      const next = pageRef.current + delta;

      if (next >= 0 && next < count) {
        setPage(next);
        return;
      }
      if (next < 0 && sectionIndex > 0) {
        pendingEdgeRef.current = "end";
        currentBlockIdRef.current = null;
        setSectionIndex(sectionIndex - 1);
        return;
      }
      if (next >= count && sectionIndex < sections.length - 1) {
        pendingEdgeRef.current = "start";
        currentBlockIdRef.current = null;
        setSectionIndex(sectionIndex + 1);
        setPage(0);
      }
    },
    [sectionIndex, sections.length]
  );


  const navTokenRef = useRef(0);
  useEffect(() => {
    if (!navRequest || navRequest.token === navTokenRef.current) return;
    navTokenRef.current = navRequest.token;
    flip(navRequest.delta);
  }, [navRequest, flip]);

  // Jump to an arbitrary block (TOC, search, bookmarks, restored anchor).
  const jumpTokenRef = useRef(0);
  useEffect(() => {
    if (!jumpTo || jumpTo.token === jumpTokenRef.current) return;
    jumpTokenRef.current = jumpTo.token;
    const original = book.blocks[Math.max(0, Math.min(jumpTo.blockIndex, book.blocks.length - 1))];
    if (!original) return;
    const index = blocks.findIndex((b) => b.id === original.id);
    if (index < 0) return;
    // Page Mode sections are single-block, so an exact hit wins; otherwise the
    // owning reflow section is the last one starting at or before the block.
    const exact = sections.findIndex((s) => s.kind === "page" && s.startIndex === index);
    const target =
      exact >= 0
        ? exact
        : sections.findIndex(
            (s, i) =>
              s.kind === "content" &&
              index >= s.startIndex &&
              (i === sections.length - 1 || index < (sections[i + 1]?.startIndex ?? Infinity))
          );

    if (target < 0) return;
    pendingBlockRef.current = original.id;
    if (target === sectionIndex) {
      requestAnimationFrame(remeasure);
    } else {
      setSectionIndex(target);
      setPage(0);
    }
  }, [jumpTo, blocks, book.blocks, sections, sectionIndex, remeasure]);

  /* ------------------------- location + pagination ------------------------ */
  const totalEstimate = useMemo(() => {
    const measured = measuredRef.current;
    let knownPages = 0;
    let knownChars = 0;
    measured.forEach((count, index) => {
      knownPages += count;
      knownChars += sections[index]?.chars ?? 0;
    });
    const perPage = knownChars > 0 && knownPages > 0 ? knownChars / knownPages : 1400;
    let total = 0;
    sections.forEach((section, index) => {
      const known = measured.get(index);
      total += known ?? Math.max(1, Math.round(section.chars / perPage));
    });
    return Math.max(total, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, measuredVersion]);

  const globalPage = useMemo(() => {
    const measured = measuredRef.current;
    let knownPages = 0;
    let knownChars = 0;
    measured.forEach((count, index) => {
      knownPages += count;
      knownChars += sections[index]?.chars ?? 0;
    });
    const perPage = knownChars > 0 && knownPages > 0 ? knownChars / knownPages : 1400;
    let before = 0;
    for (let i = 0; i < sectionIndex; i++) {
      before += measured.get(i) ?? Math.max(1, Math.round((sections[i]?.chars ?? 0) / perPage));
    }
    return before + page + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, sectionIndex, page, measuredVersion]);

  useEffect(() => {
    onPaginationChange?.({
      page: globalPage,
      totalPages: Math.max(totalEstimate, globalPage),
      percent: Math.min(100, Math.round((globalPage / Math.max(totalEstimate, globalPage)) * 100)),
      chapterTitle: activeSection?.title ?? "",
    });
  }, [globalPage, totalEstimate, activeSection, onPaginationChange]);

  // Report the first visible block so progress / anchors keep working, and
  // remember it as the reflow anchor for the next re-pagination.
  useEffect(() => {
    const inner = columnsRef.current;
    if (!inner || activeSection?.kind !== "content") return;
    const raf = requestAnimationFrame(() => {
      const left = page * step;
      const nodes = inner.querySelectorAll<HTMLElement>("[data-block-id]");
      let chosen: HTMLElement | null = null;
      for (const node of Array.from(nodes)) {
        if (node.offsetLeft + node.offsetWidth >= left - 2) {
          chosen = node;
          break;
        }
      }
      const id = chosen?.dataset.blockId;
      const index = id ? blockIndexById.get(id) ?? -1 : -1;
      const block = index >= 0 ? blocks[index] : null;
      if (!block) return;
      currentBlockIdRef.current = block.id;
      if (!onLocationChange) return;
      const originalIndex = originalIndexById.get(block.id) ?? index;
      onLocationChange({
        blockIndex: originalIndex,
        blockId: block.id,
        page: block.page,
        percent: Math.min(100, Math.round((globalPage / Math.max(totalEstimate, globalPage)) * 100)),
        snippet: "text" in block ? block.text.slice(0, 60) : "",
      });
    });
    return () => cancelAnimationFrame(raf);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sectionIndex, pageCount, blocks]);

  /* ------------------------------- selection ------------------------------ */
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const startEl = (
        range.startContainer.nodeType === 1
          ? (range.startContainer as HTMLElement)
          : range.startContainer.parentElement
      )?.closest("[data-block-id]") as HTMLElement | null;
      if (!startEl || !container.contains(startEl)) {
        setSelection(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        setSelection(null);
        return;
      }
      const start = offsetWithin(startEl, range.startContainer, range.startOffset);
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setSelection({
        blockId: startEl.dataset.blockId!,
        start,
        end: start + sel.toString().length,
        text,
        top: rect.top - containerRect.top - 48,
        left: Math.min(
          Math.max(rect.left - containerRect.left + rect.width / 2, 90),
          containerRect.width - 90
        ),
      });
    };
    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  /* -------------------------------- gestures ------------------------------ */
  const touchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef(0);
  /** While a Page-Mode image is zoomed in, gestures pan instead of flipping. */
  const [pageZoomed, setPageZoomed] = useState(false);

  useEffect(() => {
    setPageZoomed(false);
  }, [sectionIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    lastTouchRef.current = Date.now();
    if (!start || pageZoomed) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      flip(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && Date.now() - start.time < 400) {
      handleTap(t.clientX, e.currentTarget as HTMLElement);
    }
  };

  const handleTap = (clientX: number, host: HTMLElement) => {
    if (pageZoomed) return;
    if (window.getSelection()?.isCollapsed === false) return;
    const rect = host.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(rect.width, 1);
    if (ratio < 0.28) flip(-1);
    else if (ratio > 0.72) flip(1);
    else onTap?.();
  };

  const isCover = isCoverSection;
  const sidePadding = MARGIN_STEPS[settings.margin] ?? 26;


  return (
    <div
      ref={viewportRef}
      className={cn("relative h-full w-full overflow-hidden select-text", className)}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: READER_FONT_STACKS[settings.font],
        touchAction: "pan-y",
        contain: "strict",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(event) => {
        // The reader owns its own tap handling — never let it bubble to the
        // page-level toggle (that would double-fire the controls).
        event.stopPropagation();
        const target = event.target as HTMLElement;
        if (target.closest("[data-reader-toolbar]")) return;
        // Touch devices already handled the tap in touchend.
        if (Date.now() - lastTouchRef.current < 700) return;
        handleTap(event.clientX, event.currentTarget);
      }}
    >
      {isCover ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-5 px-8 text-center"
          style={{ paddingBlock: 24 }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title ? `${title} cover` : "Book cover"}
              decoding="async"
              style={{
                maxHeight: "62%",
                maxWidth: "78%",
                objectFit: "contain",
                borderRadius: 10,
                boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
              }}
            />
          ) : null}
          <div>
            <h1
              style={{
                fontSize: `${settings.fontSize * 1.7}px`,
                lineHeight: 1.25,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {title || book.meta.title || "Untitled"}
            </h1>
            {(author || book.meta.author) && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: `${settings.fontSize}px`,
                  color: theme.muted,
                }}
              >
                {author || book.meta.author}
              </p>
            )}
          </div>
        </div>
      ) : isPageMode ? (
        /* Page Mode — original page rendered as a fitted image (no reflow). */
        <div style={{ position: "absolute", inset: 0, padding: 8 }}>
          <PageImage
            block={activeSection.blocks[0] as ImageBlock}
            label={`Page ${activeSection.blocks[0]?.page ?? ""}`}
            onZoomChange={setPageZoomed}
          />
        </div>
      ) : (

        <div
          style={{
            position: "absolute",
            inset: 0,
            paddingBlock: 20,
            paddingInline: sidePadding,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              maxWidth: MAX_CONTENT_WIDTH[settings.margin] ?? 700,
              marginInline: "auto",
              overflow: "hidden",
            }}
          >
            <div
              ref={columnsRef}
              dir={book.meta.dir}
              style={{
                height: "100%",
                width: columnWidth,
                columnWidth: `${columnWidth}px`,
                columnGap: `${COLUMN_GAP}px`,
                columnFill: "auto",
                transform: `translateX(${-page * step}px)`,
                transition: "transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)",
                willChange: "transform",
              }}
            >
              {activeSection?.blocks.map((block) => (
                <BlockView
                  key={block.id}
                  block={block}
                  settings={settings}
                  highlights={highlights}
                  searchQuery={searchQuery}
                  onImageReady={remeasure}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {selection && onCreateHighlight && (
        <div
          data-reader-toolbar
          className="absolute z-50 flex items-center gap-1 rounded-full px-1.5 py-1 shadow-lg"
          style={{
            top: Math.max(selection.top, 8),
            left: selection.left,
            transform: "translateX(-50%)",
            backgroundColor:
              settings.theme === "light" || settings.theme === "sepia" ? "#1f2430" : "#2b2f36",
            color: "#fff",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs hover:bg-white/15"
            onClick={() => {
              onCreateHighlight({ ...selection, withNote: false });
              clearSelection();
            }}
          >
            <Highlighter className="h-3.5 w-3.5" /> Highlight
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs hover:bg-white/15"
            onClick={() => {
              onCreateHighlight({ ...selection, withNote: true });
              clearSelection();
            }}
          >
            <StickyNote className="h-3.5 w-3.5" /> Note
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs hover:bg-white/15"
            onClick={() => {
              void navigator.clipboard?.writeText(selection.text);
              clearSelection();
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            className="rounded-full p-1.5 hover:bg-white/15"
            onClick={clearSelection}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginatedReader;
