/**
 * Content-integrity guard for the Bookshelf reader: every extracted block must
 * be mounted exactly once in the continuous document — no loss, no duplication,
 * no clipping — regardless of typography settings.
 */
import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import PaginatedReader from "./PaginatedReader";
import { DEFAULT_READER_SETTINGS, type ReaderSettings } from "@/lib/reader/settings";
import type { Block, ReflowBook } from "@/lib/reader/types";

function makeBook(count: number): ReflowBook {
  const blocks: Block[] = Array.from({ length: count }, (_, i) =>
    i % 25 === 0
      ? {
          id: `b${i}`,
          page: Math.floor(i / 10) + 1,
          type: "heading",
          level: 2,
          text: `Chapter ${i}`,
          dir: "ltr",
        }
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

// jsdom has no ResizeObserver / rAF-driven layout.
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = (book: ReflowBook, settings: ReaderSettings) => {
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container!);
    });
  }
  act(() => {
    root!.render(
      <PaginatedReader book={book} settings={settings} highlights={[]} />
    );
  });
  return Array.from(container.querySelectorAll("[data-block-id]")).map(
    (n) => (n as HTMLElement).dataset.blockId
  );
};

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("PaginatedReader content integrity", () => {
  it("renders every block exactly once", () => {
    const book = makeBook(400);
    const ids = mount(book, DEFAULT_READER_SETTINGS);
    expect(ids.length).toBe(book.blocks.length);
    expect(new Set(ids).size).toBe(book.blocks.length);
    expect(ids[ids.length - 1]).toBe("b399");
  });

  it("keeps every block after a typography change (true reflow, no re-chunking)", () => {
    const book = makeBook(120);
    mount(book, DEFAULT_READER_SETTINGS);
    const ids = mount(book, {
      ...DEFAULT_READER_SETTINGS,
      fontSize: 30,
      margin: 3,
      justify: true,
    });
    expect(new Set(ids).size).toBe(book.blocks.length);
  });
});
