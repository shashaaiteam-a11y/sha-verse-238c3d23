/**
 * Lazy OCR bridge for scanned pages. tesseract.js is only imported when a
 * page with no extractable text is encountered, so it never affects the
 * initial bundle or normal (digital) books.
 */
export interface OcrWorker {
  recognize: (image: Blob) => Promise<string[]>;
  terminate: () => Promise<void>;
}

export async function createOcrWorker(language = "eng"): Promise<OcrWorker> {
  const { createWorker } = await import("tesseract.js");
  const worker: any = await createWorker(language);

  return {
    async recognize(image: Blob) {
      const result: any = await worker.recognize(image, {}, { blocks: true, text: true });
      const data = result?.data ?? {};

      const fromBlocks = (data.blocks ?? [])
        .flatMap((block: any) => block?.paragraphs ?? [])
        .map((paragraph: any) => String(paragraph?.text ?? "").trim())
        .filter(Boolean);

      if (fromBlocks.length) return fromBlocks;

      // Fallback: split plain text on blank lines.
      return String(data.text ?? "")
        .split(/\n\s*\n/)
        .map((chunk: string) => chunk.replace(/\s+/g, " ").trim())
        .filter(Boolean);
    },
    async terminate() {
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
    },
  };
}
