/**
 * Reader text sanitisation (Bookshelf Reader only).
 *
 * Two jobs:
 *  1. Make every extracted string valid, normalised Unicode so Hindi, Urdu,
 *     Arabic, CJK and Latin all render correctly (UTF-8 mojibake repair + NFC).
 *  2. Detect PDF/EPUB internal metadata that leaked into the text layer so the
 *     reader never shows it as readable content.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/** Zero-width + BOM noise (keep ZWJ/ZWNJ — they are meaningful in Indic/Arabic). */
const INVISIBLE = /[\uFEFF\u00AD\u2060]/g;
const PRIVATE_USE = /[\uE000-\uF8FF]/g;
const LIGATURES: Record<string, string> = {
  "\uFB00": "ff",
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
  "\uFB05": "st",
  "\uFB06": "st",
};

const MOJIBAKE = /[ÃÂÐÑà][\u0080-\u00BF]|â€|Ã¢â‚¬/;

/** Repair text that was UTF-8 bytes wrongly decoded as latin-1. */
function repairMojibake(input: string): string {
  if (!MOJIBAKE.test(input)) return input;
  try {
    const bytes = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      if (code > 0xff) return input; // not a latin-1 round trip
      bytes[i] = code;
    }
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    // Only accept the repair when it removed the replacement noise.
    if (decoded.includes("\uFFFD")) return input;
    return decoded;
  } catch {
    return input;
  }
}

/** Normalise a single extracted string for display. */
export function normalizeReaderText(input: string): string {
  if (!input) return "";
  let text = repairMojibake(input);
  text = text.replace(CONTROL_CHARS, " ").replace(INVISIBLE, "").replace(PRIVATE_USE, "");
  text = text.replace(/[\uFB00-\uFB06]/g, (m) => LIGATURES[m] ?? m);
  try {
    text = text.normalize("NFC");
  } catch {
    /* ignore */
  }
  // Collapse runs of spaces/tabs but keep intentional single spaces.
  return text.replace(/[ \t\u00A0]{2,}/g, " ").trim();
}

const METADATA_PATTERNS: RegExp[] = [
  /^%%?(PDF|EOF)/i,
  /^\d+\s+\d+\s+obj\b/,
  /^(endobj|endstream|stream|xref|trailer|startxref)\b/i,
  /^<<.*>>$/s,
  /^\/(Type|Font|FontDescriptor|Filter|Length|Contents|MediaBox|Producer|Creator|ModDate|CreationDate|Metadata|Linearized|Encrypt)\b/i,
  /<\?xpacket\b/i,
  /<x:xmpmeta|rdf:RDF|xmlns:(dc|pdf|xmp)\b/i,
  /^D:\d{8,14}[Z+\-']?/,
  /^(Producer|Creator|CreationDate|ModDate|Trapped|PTEX\.\w+)\s*[:(]/i,
  /^\(?Adobe (Identity|PDF Library|InDesign|Acrobat)/i,
  /^(Microsoft® Word|Acrobat Distiller|Ghostscript|LaTeX with|pdfTeX-)/i,
  /^\s*\/[A-Za-z]+\s+\d+\s+\d+\s+R\b/,
];

/** True when a text block is document metadata rather than readable content. */
export function isHiddenMetadata(rawText: string): boolean {
  const text = rawText.trim();
  if (!text) return true;
  if (METADATA_PATTERNS.some((re) => re.test(text))) return true;

  // Long unbroken token soup (hex/base64 stream residue) with no spaces.
  if (text.length > 40 && !/\s/.test(text) && /^[A-Za-z0-9+/=<>]+$/.test(text)) return true;

  // Mostly-symbol noise with almost no letters in any script.
  const letters = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (text.length > 12 && letters / text.length < 0.25) return true;

  return false;
}
