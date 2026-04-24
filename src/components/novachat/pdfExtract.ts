// Client-side PDF text extraction for NovaChat
// Uses pdfjs-dist with a CDN worker so we don't bloat bundle.
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source from CDN matching installed version
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractPdfText(file: File, maxPages = 20): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const out: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    out.push(`--- Page ${i} ---\n${text}`);
  }
  let result = out.join('\n\n');
  if (pdf.numPages > maxPages) {
    result += `\n\n[Note: Document has ${pdf.numPages} pages, only first ${maxPages} extracted.]`;
  }
  // Cap at ~40k chars to fit in context
  if (result.length > 40000) {
    result = result.slice(0, 40000) + '\n\n[Truncated...]';
  }
  return result;
}

export async function extractTextFile(file: File): Promise<string> {
  const text = await file.text();
  return text.length > 40000 ? text.slice(0, 40000) + '\n\n[Truncated...]' : text;
}
