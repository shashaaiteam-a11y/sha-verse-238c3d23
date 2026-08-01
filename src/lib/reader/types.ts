/**
 * Internal reflowable book model for the SHA-VERSE Bookshelf Reader.
 *
 * The reader NEVER renders the raw PDF in Reader Mode. The PDF is parsed once
 * into this structured representation and the reader renders semantic HTML
 * from it, so real text reflow (not zoom/scale) happens on every setting change.
 */

export type Direction = "ltr" | "rtl";

export interface BlockBase {
  /** Stable id: `b{globalIndex}` — used for anchoring reading position. */
  id: string;
  /** 1-based source page in the original PDF (for mode switching / bookmarks). */
  page: number;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
  dir: Direction;
}

export interface ParagraphBlock extends BlockBase {
  type: "paragraph";
  text: string;
  dir: Direction;
  /** First-line indent detected in the source. */
  indent?: boolean;
  /** Rendered as a blockquote-style pull quote. */
  quote?: boolean;
  /** Small print (footnotes / captions). */
  small?: boolean;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  blob: Blob;
  width: number;
  height: number;
  alt: string;
}

export interface TableBlock extends BlockBase {
  type: "table";
  rows: string[][];
}

export interface PageBreakBlock extends BlockBase {
  type: "pagebreak";
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | TableBlock
  | PageBreakBlock;

export interface Chapter {
  id: string;
  title: string;
  /** Index into `ReflowBook.blocks`. */
  blockIndex: number;
  page: number;
  level: number;
}

export interface ReflowBookMeta {
  title?: string;
  author?: string;
  language?: string;
  totalPages: number;
  /** True when at least one page had to be OCR'd. */
  scanned: boolean;
  dir: Direction;
}

export interface ReflowBook {
  version: number;
  bookId: string;
  meta: ReflowBookMeta;
  blocks: Block[];
  chapters: Chapter[];
}

/** Saved reading location — resilient to font/layout changes by design. */
export interface ReadingAnchor {
  blockId: string;
  blockIndex: number;
  charOffset: number;
  /** Short text snippet used to re-find the position if block ids shift. */
  snippet: string;
  page: number;
  updatedAt: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  blockId: string;
  start: number;
  end: number;
  text: string;
  color: string;
  note?: string;
  createdAt: number;
}

export const REFLOW_MODEL_VERSION = 4;
