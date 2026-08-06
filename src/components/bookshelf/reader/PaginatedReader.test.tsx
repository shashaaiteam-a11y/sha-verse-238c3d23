/**
 * Content-integrity guard for the Bookshelf reader: every extracted block must
 * be mounted exactly once in the continuous document — no loss, no duplication,
 * no clipping — regardless of typography settings.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import PaginatedReader from "./PaginatedReader";
import { DEFAULT_READER_SETTINGS } from "@/lib/reader/settings";
import type { Block, ReflowBook } from "@/lib/reader/types";

function makeBook(count: number): ReflowBook {
  const blocks: Block[] = Array.from({ length: count }, (_, i) =>
    i % 25 === 0
      ? { id: `b${i}`, page: Math.floor(i / 10) + 1, type: "heading", level: 2, text: `Chapter ${i}`, dir: "ltr" }
      : {
          id: `b${i}`,
          page: Math.floor(i / 10) + 1,
          type: "paragraph",
          text: `Paragraph number ${i} with enough words to wrap across several rendered lines.`,
          dir: "ltr",
        }
  );
  return {
    version: 5,
    bookId: "test",
    meta: { totalPages: 40, scanned: false, dir: "ltr", title: "Test" },
    blocks,
    chapters: [],
  };
}

describe("PaginatedReader content integrity", () => {
  it("renders every block exactly once", () => {
    const book = makeBook(400);
    const { container } = render(
      <PaginatedReader book={book} settings={DEFAULT_READER_SETTINGS} highlights={[]} />
    );
    const ids = Array.from(container.querySelectorAll("[data-block-id]")).map(
      (n) => (n as HTMLElement).dataset.blockId
    );
    expect(ids.length).toBe(book.blocks.length);
    expect(new Set(ids).size).toBe(book.blocks.length);
    expect(ids[ids.length - 1]).toBe("b399");
  });

  it("keeps every block after a typography change (true reflow, no re-chunking)", () => {
    const book = makeBook(120);
    const { container, rerender } = render(
      <PaginatedReader book={book} settings={DEFAULT_READER_SETTINGS} highlights={[]} />
    );
    rerender(
      <PaginatedReader
        book={book}
        settings={{ ...DEFAULT_READER_SETTINGS, fontSize: 30, margin: 3, justify: true }}
        highlights={[]}
      />
    );
    const ids = Array.from(container.querySelectorAll("[data-block-id]")).map(
      (n) => (n as HTMLElement).dataset.blockId
    );
    expect(new Set(ids).size).toBe(book.blocks.length);
  });
});
