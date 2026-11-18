'use client';

import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import type { BulkStatus } from '@/hooks/use-outreach';

/** Shared bits of the admin "Participants & messaging" page (app/[locale]/dashboard/admin/outreach). */

export const inputCls =
  'focus-ring block min-h-[44px] w-full rounded-lg border border-ink-400 bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-400 sm:text-sm';
export const primaryBtn =
  'focus-ring inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60';
export const secondaryBtn =
  'focus-ring inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-ink-400 bg-white px-5 py-2 text-sm font-semibold text-ink-700 transition hover:border-ink-600 disabled:cursor-not-allowed disabled:opacity-60';

export function Card({ title, intro, children, id }: { title: string; intro?: string; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
      <h2 id={id} className="font-display text-base font-bold text-ink-900">
        {title}
      </h2>
      {intro && <p className="mt-1 text-sm text-ink-600">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ErrorNote({ children, lang }: { children?: React.ReactNode; lang?: string }) {
  return (
    <div role="alert">
      {children && (
        <p className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span lang={lang}>{children}</span>
        </p>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<BulkStatus, string> = {
  QUEUED: 'bg-ink-50 text-ink-700',
  SENDING: 'bg-sun-50 text-sun-600',
  COMPLETED: 'bg-brand-100 text-brand-800',
  COMPLETED_WITH_ERRORS: 'bg-sun-100 text-amber-deep',
  FAILED: 'bg-red-50 text-red-700',
};

export function StatusPill({ status }: { status: BulkStatus }) {
  const t = useTranslations('outreach');
  return (
    <span className={clsx('inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLES[status])}>
      {t(`status_${status}`)}
    </span>
  );
}

export function useFormatDate() {
  const locale = useLocale();
  return (iso: string | null | undefined, withTime = true) =>
    iso
      ? new Date(iso).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        })
      : '—';
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const t = useTranslations('outreach');
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-3 flex items-center justify-between gap-2 text-sm" aria-label={t('pageOf', { page, total: totalPages })}>
      <button type="button" className={secondaryBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {t('previous')}
      </button>
      <span className="text-ink-600">{t('pageOf', { page, total: totalPages })}</span>
      <button type="button" className={secondaryBtn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        {t('next')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export interface OutreachErrorText {
  text: string;
  lang?: string;
  field?: 'code' | 'duplicate';
}

/** API error → text in the page language (unknown server text stays English, marked lang="en"). */
export function useOutreachError() {
  const t = useTranslations('outreach');
  const locale = useLocale();
  return (error: unknown): OutreachErrorText => {
    if (!(error instanceof ApiError)) return { text: t('err_network') };
    const m = error.message || '';
    const details = (error.details ?? {}) as { retryAfterSeconds?: number };
    if (/unknown placeholder/i.test(m)) return { text: t('err_unknownPlaceholder', { list: '{{name}}, {{challenge}}, {{irn}}' }) };
    if (/still being sent/i.test(m)) return { text: t('err_activeSend') };
    if (/already sent to this challenge/i.test(m)) return { text: t('err_duplicate'), field: 'duplicate' };
    const left = m.match(/incorrect verification code\. (\d+) attempt/i);
    if (left) return { text: t('err_codeIncorrect', { left: Number(left[1]) }), field: 'code' };
    if (/expired or was not requested/i.test(m)) return { text: t('err_codeExpired'), field: 'code' };
    if (/too many incorrect attempts/i.test(m)) return { text: t('err_tooManyAttempts'), field: 'code' };
    if (error.status === 429 && details.retryAfterSeconds) return { text: t('err_wait', { seconds: details.retryAfterSeconds }) };
    if (error.status === 429) return { text: t('err_tooMany') };
    if (error.status === 403) return { text: t('err_forbidden') };
    if (!m) return { text: t('err_generic') };
    return { text: m, lang: locale === 'en' ? undefined : 'en' };
  };
}

/** Rough per-recipient SMS part count (placeholders make the real length vary a little). */
export function estimateSmsParts(text: string) {
  // GSM-7 covers basic Latin; anything else (e.g. Bangla) forces UCS-2.
  const gsm = /^[\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅåÉÄÖÑÜ§¿äöñüà€]*$/.test(text);
  const n = text.length;
  return gsm
    ? { encoding: 'GSM-7', parts: n <= 160 ? 1 : Math.ceil(n / 153) }
    : { encoding: 'UCS-2', parts: n <= 70 ? 1 : Math.ceil(n / 67) };
}
