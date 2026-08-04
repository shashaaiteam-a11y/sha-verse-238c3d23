/**
 * Reader text-quality analysis (Bookshelf Reader only).
 *
 * This module is the brain of the adaptive rendering pipeline. Before any text
 * is shown to a reader we ask three questions:
 *
 *   1. Is the glyph mapping of this PDF trustworthy? (broken CID fonts produce
 *      private-use / replacement characters — typical for Hindi & Urdu PDFs)
 *   2. Does this line look like real prose, or like OCR / glyph soup?
 *   3. Is this line actual book content, or publisher / Gutenberg boilerplate?
 *
 * When a page fails (1) or mostly fails (2) the extractor stops trying to
 * reflow it and renders the original page as an image instead — exactly what
 * Google Play Books does for scanned / non-embedded-font books.
 */

/** Characters that indicate a broken font-to-Unicode mapping. */
const DAMAGED_GLYPH_RE = /[\uFFFD\uE000-\uF8FF]/g;
/** A dotted circle means a combining mark lost its base character. */
const ORPHAN_MARK_RE = /[\u25CC]/g;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const DEVANAGARI_MARK_RE = /[\u093E-\u094D\u0962\u0963]/g;
const LATIN_WORD_RE = /[A-Za-zÀ-ÿ]+/g;

/**
 * Fraction of characters in a RAW (pre-sanitised) string that came out of the
 * PDF broken. Must be called before `normalizeReaderText` strips them.
 */
export function glyphDamageRatio(raw: string): number {
  if (!raw) return 0;
  const damaged =
    (raw.match(DAMAGED_GLYPH_RE)?.length ?? 0) + (raw.match(ORPHAN_MARK_RE)?.length ?? 0);
  return damaged / raw.length;
}

/**
 * Devanagari text without any vowel signs over a long stretch means the
 * matras were dropped by the extractor — the text is unreadable Hindi.
 */
export function devanagariLooksBroken(text: string): boolean {
  if (!DEVANAGARI_RE.test(text)) return false;
  const letters = text.match(/[\u0900-\u097F]/g)?.length ?? 0;
  if (letters < 40) return false;
  const marks = text.match(DEVANAGARI_MARK_RE)?.length ?? 0;
  // Natural Hindi prose carries a matra/virama on roughly a third of letters.
  return marks / letters < 0.08;
}

/**
 * 0 = clean prose, 1 = pure garbage. Tuned against OCR noise and PDF glyph
 * soup like: `i = HE EE | v' : TEE egy. ih = el HE ; : 1 i SAR ii] ik LE el 2`
 */
export function garbageScore(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length < 8) return 0;

  // Non-Latin scripts (Devanagari, Arabic, CJK…) are checked separately.
  const latin = trimmed.match(LATIN_WORD_RE)?.join("").length ?? 0;
  if (latin / trimmed.length < 0.4) return 0;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return 0;

  let suspicious = 0;
  for (const token of tokens) {
    const word = token.replace(/[^A-Za-zÀ-ÿ]/g, "");
    const isSymbolOnly = word.length === 0;
    // Very short fragments that are not real English words.
    const isStub =
      word.length > 0 &&
      word.length <= 2 &&
      !/^(a|i|an|as|at|be|by|do|go|he|if|in|is|it|me|my|no|of|on|or|so|to|up|us|we|am|hi|ok)$/i.test(
        word
      );
    // ALLCAPS fragments mixed inside prose (HE EE TEE SAR) or vowel-less runs.
    const isShout = /^[A-Z]{2,4}$/.test(word) && word.length <= 4;
    const isVowelless = word.length >= 4 && !/[aeiouyAEIOUY]/.test(word);
    if (isSymbolOnly || isStub || isShout || isVowelless) suspicious++;
  }

  const symbolDensity =
    (trimmed.match(/[=|\\/<>\[\]{}~^_`@#$%*+]/g)?.length ?? 0) / trimmed.length;

  return Math.min(1, suspicious / tokens.length + symbolDensity * 2);
}

/** A line the reader must never render as book content. */
export function isGarbageLine(text: string): boolean {
  return garbageScore(text) >= 0.55;
}

/**
 * Publisher / distributor boilerplate. Project Gutenberg wraps every book in a
 * licence header + footer that is not part of the work itself.
 */
const BOILERPLATE_RE: RegExp[] = [
  /\*{3}\s*(START|END) OF (THE|THIS) PROJECT GUTENBERG/i,
  /\*{3}\s*(START|END) OF .*GUTENBERG EBOOK/i,
  /^\s*The Project Gutenberg (EBook|eBook|Etext)/i,
  /Project Gutenberg(-tm| Literary Archive Foundation)?\s+(License|licence)/i,
  /www\.gutenberg\.(org|net)/i,
  /^\s*Produced by .{0,120}(Proofread|Distributed|Online)/i,
  /^\s*(Release Date|Posting Date|Last Updated|Character set encoding|Language)\s*:/i,
  /almost no restrictions whatsoever\. ?You may copy it/i,
  /^\s*(Updated editions will replace|This eBook is for the use of anyone)/i,
  /^\s*(END OF THE PROJECT GUTENBERG|Section \d+\.\s+Information about)/i,
];

export function isBoilerplate(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return BOILERPLATE_RE.some((re) => re.test(t));
}

export interface PageQuality {
  /** True when the page's text layer cannot be trusted for reflow. */
  unusable: boolean;
  glyphDamage: number;
  garbageRatio: number;
  reason: "ok" | "glyph-damage" | "broken-script" | "ocr-noise" | "empty";
}

/**
 * Verdict for one PDF page, computed from the RAW extracted lines.
 * `unusable` → the extractor renders the page as an image instead.
 */
export function assessPageText(rawLines: string[]): PageQuality {
  const joined = rawLines.join(" ");
  const plain = joined.replace(/\s/g, "");
  if (plain.length < 12) {
    return { unusable: true, glyphDamage: 0, garbageRatio: 0, reason: "empty" };
  }

  const glyphDamage = glyphDamageRatio(joined);
  if (glyphDamage > 0.06) {
    return { unusable: true, glyphDamage, garbageRatio: 0, reason: "glyph-damage" };
  }

  if (devanagariLooksBroken(joined)) {
    return { unusable: true, glyphDamage, garbageRatio: 0, reason: "broken-script" };
  }

  const substantial = rawLines.filter((l) => l.trim().length >= 12);
  const bad = substantial.filter((l) => isGarbageLine(l)).length;
  const garbageRatio = substantial.length ? bad / substantial.length : 0;
  if (substantial.length >= 4 && garbageRatio >= 0.5) {
    return { unusable: true, glyphDamage, garbageRatio, reason: "ocr-noise" };
  }

  return { unusable: false, glyphDamage, garbageRatio, reason: "ok" };
}
