const ARABIC_YEH = /\u064A/g;
const ALEF_MAKSURA = /\u0649/g;
const ARABIC_KAF = /\u0643/g;
const TATWEEL = /\u0640/g;
const ZWNJ = /\u200c/g;
const DIACRITICS = /[\u064B-\u065F\u0670]/g;
const WHITESPACE = /\s+/g;

/** Search-only Persian/Arabic folding. Never apply to Postgres values. */
export function normalizePersianText(input: string | null | undefined): string {
  if (input == null) return "";

  const text = String(input);
  if (!text) return "";

  return text
    .normalize("NFKC")
    .replace(ARABIC_YEH, "\u06CC")
    .replace(ALEF_MAKSURA, "\u06CC")
    .replace(ARABIC_KAF, "\u06A9")
    .replace(DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(ZWNJ, "")
    .replace(WHITESPACE, " ")
    .trim();
}
