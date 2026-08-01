import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Highlighter, StickyNote, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block, Highlight, ImageBlock, ReflowBook } from "@/lib/reader/types";
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

interface ReflowReaderProps {
  book: ReflowBook;
  settings: ReaderSettings;
  highlights: Highlight[];
  searchQuery?: string;
  /** Bump `token` to force a jump even to the same block. */
  jumpTo?: { blockIndex: number; token: number } | null;
  onLocationChange?: (location: ReaderLocation) => void;
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

const MARGIN_STEPS = ["min(6vw, 20px)", "min(9vw, 40px)", "min(12vw, 72px)", "min(16vw, 112px)"];
const CONTENT_WIDTHS = ["44rem", "40rem", "36rem", "32rem"];

interface Range {
  start: number;
  end: number;
  kind: "highlight" | "search";
  color?: string;
  id?: string;
}

/** Split plain text into styled segments for highlights + search matches. */
function segmentText(text: string, ranges: Range[]) {
  if (!ranges.length) return [{ text, range: null as Range | null }];

  const bounds = new Set<number>([0, text.length]);
  ranges.forEach((r) => {
    bounds.add(Math.max(0, Math.min(text.length, r.start)));
    bounds.add(Math.max(0, Math.min(text.length, r.end)));
  });
  const points = [...bounds].sort((a, b) => a - b);

  const segments: { text: string; range: Range | null }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;
    const hit =
      ranges.find((r) => r.kind === "search" && r.start <= start && r.end >= end) ??
      ranges.find((r) => r.start <= start && r.end >= end) ??
      null;
    segments.push({ text: text.slice(start, end), range: hit });
  }
  return segments;
}

function findSearchRanges(text: string, query: string): Range[] {
  if (!query || query.trim().length < 2) return [];
  const needle = query.trim().toLowerCase();
  const haystack = text.toLowerCase();
  const out: Range[] = [];
  let from = 0;
  while (out.length < 40) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    out.push({ start: index, end: index + needle.length, kind: "search" });
    from = index + needle.length;
  }
  return out;
}

const TextContent = ({
  text,
  ranges,
}: {
  text: string;
  ranges: Range[];
}) => (
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
            borderRadius: "2px",
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

const ImageContent = ({ block }: { block: ImageBlock }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(block.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [block.blob]);

  return (
    <figure style={{ margin: "1.4em 0" }}>
      {src && (
        <img
          src={src}
          alt={block.alt}
          loading="lazy"
          decoding="async"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            borderRadius: 6,
            aspectRatio: `${block.width} / ${block.height}`,
          }}
        />
      )}
    </figure>
  );
};

const BlockView = memo(
  ({
    block,
    settings,
    highlights,
    searchQuery,
  }: {
    block: Block;
    settings: ReaderSettings;
    highlights: Highlight[];
    searchQuery?: string;
  }) => {
    const theme = READER_THEMES[settings.theme];

    if (block.type === "pagebreak") {
      return <div aria-hidden style={{ height: settings.fontSize * 0.6 }} />;
    }

    if (block.type === "image") {
      return <ImageContent block={block} />;
    }

    if (block.type === "table") {
      return (
        <div style={{ overflowX: "auto", margin: "1.2em 0" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: `${settings.fontSize * 0.86}px`,
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
                        padding: "6px 10px",
                        verticalAlign: "top",
                        fontWeight: rIndex === 0 ? 600 : 400,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const ranges: Range[] = [
      ...highlights
        .filter((h) => h.blockId === block.id)
        .map<Range>((h) => ({
          start: h.start,
          end: h.end,
          kind: "highlight",
          color: h.color,
          id: h.id,
        })),
      ...findSearchRanges(block.text, searchQuery ?? ""),
    ];

    if (block.type === "heading") {
      const scale = block.level === 1 ? 1.6 : block.level === 2 ? 1.32 : 1.14;
      const Tag = (`h${Math.min(block.level + 1, 4)}`) as "h2" | "h3" | "h4";
      return (
        <Tag
          data-block-id={block.id}
          dir={block.dir}
          style={{
            fontSize: `${settings.fontSize * scale}px`,
            lineHeight: 1.28,
            fontWeight: 700,
            margin: `${settings.fontSize * 1.1}px 0 ${settings.fontSize * 0.45}px`,
            letterSpacing: "-0.01em",
          }}
        >
          <TextContent text={block.text} ranges={ranges} />
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
          textIndent: block.indent && !block.quote ? "1.4em" : undefined,
          textAlign: settings.justify && !block.quote ? "justify" : "start",
          hyphens: settings.justify ? "auto" : undefined,
          letterSpacing: settings.looseSpacing ? "0.02em" : undefined,
          wordSpacing: settings.looseSpacing ? "0.1em" : undefined,
          paddingInlineStart: block.quote ? "1em" : undefined,
          borderInlineStart: block.quote ? `3px solid ${theme.muted}66` : undefined,
          fontStyle: block.quote ? "italic" : undefined,
          color: block.small ? theme.muted : undefined,
          overflowWrap: "break-word",
          textWrap: settings.justify ? undefined : ("pretty" as never),
          orphans: 2,
          widows: 2,
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <TextContent text={block.text} ranges={ranges} />
      </p>
    );

  }
);
BlockView.displayName = "BlockView";

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

const ReflowReader = ({
  book,
  settings,
  highlights,
  searchQuery,
  jumpTo,
  onLocationChange,
  onCreateHighlight,
  onTap,
  className,
}: ReflowReaderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = READER_THEMES[settings.theme];
  const [selection, setSelection] = useState<{
    blockId: string;
    start: number;
    end: number;
    text: string;
    top: number;
    left: number;
  } | null>(null);

  const estimate = useMemo(
    () => Math.round(settings.fontSize * settings.lineHeight * 3.4),
    [settings.fontSize, settings.lineHeight]
  );

  const virtualizer = useVirtualizer({
    count: book.blocks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimate,
    overscan: 8,
    getItemKey: (index) => book.blocks[index]?.id ?? index,
  });

  // Keep the reader anchored to the same block when typography changes.
  const anchorIndexRef = useRef(0);
  useEffect(() => {
    virtualizer.measure();
    const index = anchorIndexRef.current;
    if (index > 0) {
      requestAnimationFrame(() => virtualizer.scrollToIndex(index, { align: "start" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fontSize, settings.lineHeight, settings.margin, settings.font, settings.paragraphSpacing]);

  useEffect(() => {
    if (!jumpTo) return;
    const index = Math.max(0, Math.min(jumpTo.blockIndex, book.blocks.length - 1));
    requestAnimationFrame(() => virtualizer.scrollToIndex(index, { align: "start" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.token]);

  // Report reading location (throttled through rAF by the virtualizer itself).
  const items = virtualizer.getVirtualItems();
  useEffect(() => {
    const first = items[0];
    if (!first) return;
    anchorIndexRef.current = first.index;
    const block = book.blocks[first.index];
    if (!block || !onLocationChange) return;
    onLocationChange({
      blockIndex: first.index,
      blockId: block.id,
      page: block.page,
      percent: Math.round(((first.index + 1) / Math.max(book.blocks.length, 1)) * 100),
      snippet: "text" in block ? block.text.slice(0, 60) : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items[0]?.index, book.blocks.length]);

  // Text selection → highlight toolbar
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const startEl = (range.startContainer.nodeType === 1
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
      const end = start + sel.toString().length;
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setSelection({
        blockId: startEl.dataset.blockId!,
        start,
        end,
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

  return (
    <div
      ref={scrollRef}
      className={cn("relative w-full h-full overflow-y-auto overscroll-contain", className)}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        WebkitOverflowScrolling: "touch",
        contain: "strict",
      }}
      onClick={(event) => {
        if (window.getSelection()?.isCollapsed !== false) {
          const target = event.target as HTMLElement;
          if (!target.closest("[data-reader-toolbar]")) onTap?.();
        }
      }}
    >
      <div
        style={{
          maxWidth: CONTENT_WIDTHS[settings.margin] ?? CONTENT_WIDTHS[1],
          margin: "0 auto",
          paddingInline: MARGIN_STEPS[settings.margin] ?? MARGIN_STEPS[1],
          paddingBlock: "24px 96px",
          fontFamily: READER_FONT_STACKS[settings.font],
        }}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
          {items.map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                insetInline: 0,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <BlockView
                block={book.blocks[item.index]}
                settings={settings}
                highlights={highlights}
                searchQuery={searchQuery}
              />
            </div>
          ))}
        </div>
      </div>

      {selection && onCreateHighlight && (
        <div
          data-reader-toolbar
          className="absolute z-50 flex items-center gap-1 rounded-full px-1.5 py-1 shadow-lg"
          style={{
            top: Math.max(selection.top, 8),
            left: selection.left,
            transform: "translateX(-50%)",
            backgroundColor: settings.theme === "light" || settings.theme === "sepia" ? "#1f2430" : "#2b2f36",
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

export default ReflowReader;
