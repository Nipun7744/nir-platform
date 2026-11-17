/**
 * WCAG 3.1.2 Language of Parts (2026-11-17). Database content is often only in English (titleEn,
 * category nameEn, organisation names …) even on the Bangla site, and admins sometimes type Bangla
 * into "English" fields. This picks the language from the text itself — any Bengali-script
 * character means Bangla — and returns a `lang` value only when it differs from the page's, so
 * screen readers switch pronunciation without changing anything visible.
 */
const BENGALI = /[ঀ-৿]/;

export function textLang(text: string | null | undefined, pageLocale: string): 'en' | 'bn' | undefined {
  if (!text || !/\p{L}/u.test(text)) return undefined; // numbers / punctuation only: no switch
  const lang = BENGALI.test(text) ? 'bn' : 'en';
  return lang === pageLocale ? undefined : lang;
}
