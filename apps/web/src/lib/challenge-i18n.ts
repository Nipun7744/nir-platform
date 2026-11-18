import { useLocale } from 'next-intl';
import type { ChallengeDto } from '@/hooks/use-content';
import type { ChallengeFormFieldDto } from '@/components/challenge-form/types';

/**
 * Bilingual challenge content (2026-11-15). Every admin-entered challenge text has an English
 * value and an optional Bangla one; the Bangla site shows Bangla when it was entered and falls
 * back to English otherwise. The English site always shows English.
 */
export function pickText(locale: string, en?: string | null, bn?: string | null): string {
  return (locale === 'bn' && bn?.trim() ? bn : en) ?? '';
}

export function useChallengeText() {
  const locale = useLocale();
  const pick = (en?: string | null, bn?: string | null) => pickText(locale, en, bn);
  return {
    locale,
    pick,
    title: (c: Pick<ChallengeDto, 'titleEn' | 'titleBn'>) => pick(c.titleEn, c.titleBn),
    description: (c: Pick<ChallengeDto, 'descriptionEn' | 'descriptionBn'>) => pick(c.descriptionEn, c.descriptionBn),
    organizer: (c: Pick<ChallengeDto, 'organizingAgency' | 'organizingAgencyBn'>) => pick(c.organizingAgency, c.organizingAgencyBn),
    prize: (c: Pick<ChallengeDto, 'prizeInfoEn' | 'prizeInfoBn'>) => pick(c.prizeInfoEn, c.prizeInfoBn),
    /** The admin's custom submit-button label (2026-11-16), else `fallback` (the default label). */
    submitLabel: (c: Pick<ChallengeDto, 'submitButtonLabelEn' | 'submitButtonLabelBn'>, fallback: string) =>
      pick(c.submitButtonLabelEn, c.submitButtonLabelBn).trim() || fallback,
    field: localizeField(locale),
    /** Dates in the visitor's language (Bangla digits/month names on the Bangla site). */
    date: (value: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
      new Date(value).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'UTC', ...opts }),
  };
}

/** A form field's display text in the given locale. Option VALUES stay English; only labels change. */
export function localizeField(locale: string) {
  return (f: ChallengeFormFieldDto) => ({
    label: pickText(locale, f.label, f.labelBn),
    description: pickText(locale, f.description, f.descriptionBn) || null,
    placeholder: pickText(locale, f.placeholder, f.placeholderBn) || null,
    helpText: pickText(locale, f.helpText, f.helpTextBn) || null,
    optionLabel: (option: string) => {
      const i = f.options.indexOf(option);
      return pickText(locale, option, i >= 0 ? f.optionsBn?.[i] : null);
    },
  });
}
