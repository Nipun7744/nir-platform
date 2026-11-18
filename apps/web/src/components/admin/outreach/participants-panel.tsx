'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Download, FileSpreadsheet, Loader2, Search, Users } from 'lucide-react';
import { useExportParticipants, useParticipants } from '@/hooks/use-outreach';
import { Card, ErrorNote, Pager, inputCls, primaryBtn, useFormatDate, useOutreachError } from './outreach-ui';

/** Participant table (searchable, paged) + the Excel download for one challenge. */
export function ParticipantsPanel({ challengeId }: { challengeId: string }) {
  const t = useTranslations('outreach');
  const locale = useLocale();
  const fmt = useFormatDate();
  const errorText = useOutreachError();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [lang, setLang] = useState<'en' | 'bn'>(locale === 'bn' ? 'bn' : 'en');
  const [done, setDone] = useState('');
  const { data, isLoading, isError, isFetching } = useParticipants(challengeId, q, page);
  const exporter = useExportParticipants();
  const exportError = exporter.error ? errorText(exporter.error) : null;

  const onExport = async () => {
    setDone('');
    try {
      const file = await exporter.mutateAsync({ challengeId, lang });
      setDone(t('exportDone', { file }));
    } catch {
      /* shown via exporter.error */
    }
  };

  return (
    <Card id="participants-title" title={t('participantsTitle')} intro={t('participantsIntro')}>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
          <div className="rounded-xl bg-mist p-3">
            <p className="text-xs font-medium text-ink-600">{t('statParticipants')}</p>
            <p className="font-display text-2xl font-extrabold text-ink-900">{data?.totalParticipants ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-mist p-3">
            <p className="text-xs font-medium text-ink-600">{t('statSubmissions')}</p>
            <p className="font-display text-2xl font-extrabold text-ink-900">{data?.totalSubmissions ?? '—'}</p>
          </div>
          {/* Called as a function, not <ExportBox />, so it isn't remounted (and focus lost) on every render. */}
          {exportBox()}
        </div>
        <div className="min-w-0">

          <form
            role="search"
            className="relative mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQ(search.trim());
            }}
          >
            <label htmlFor="participant-search" className="sr-only">
              {t('searchLabel')}
            </label>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-400" aria-hidden="true" />
            <input
              id="participant-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => {
                if (search.trim() !== q) {
                  setPage(1);
                  setQ(search.trim());
                }
              }}
              placeholder={t('searchPlaceholder')}
              className={`${inputCls} pl-9`}
            />
          </form>

          {isError && <div className="mt-3"><ErrorNote>{t('loadError')}</ErrorNote></div>}

          <div className={`relative mt-3 overflow-x-auto ${isFetching ? 'opacity-70' : ''}`}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-600">
                  <th scope="col" className="py-2 pr-3 font-semibold">{t('colName')}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t('colEmail')}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t('colMobile')}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t('colSubmissions')}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t('colLastSubmitted')}</th>
                  <th scope="col" className="py-2 font-semibold">{t('colAccount')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="py-6 text-center text-ink-600">{t('loading')}</td></tr>
                )}
                {data?.items.map((p) => (
                  <tr key={p.userId} className="border-b border-ink-50 align-top">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-ink-900">{p.fullName}</p>
                      {p.irn && <p className="font-mono text-xs text-ink-600">{p.irn}</p>}
                    </td>
                    <td className="break-all py-2.5 pr-3 text-ink-700">{p.email}</td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-ink-700">{p.phone ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-ink-700">{p.submissionCount}</td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-ink-700">{fmt(p.lastSubmittedAt, false)}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.isActive ? 'bg-brand-100 text-brand-800' : 'bg-red-50 text-red-700'}`}>
                        {p.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
                {data && data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-600">
                      <Users className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                      {q ? t('noMatches') : t('noParticipants')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
        </div>
      </div>
    </Card>
  );

  function exportBox() {
    return (
      <div className="rounded-xl border border-ink-100 bg-mist/60 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <FileSpreadsheet className="h-5 w-5 text-brand-700" aria-hidden="true" /> {t('exportTitle')}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-ink-600">{t('exportLanguage')}</legend>
            <div className="flex gap-1.5">
              {(['en', 'bn'] as const).map((l) => (
                <label
                  key={l}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border-2 px-3 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nirgreen-deep ${
                    lang === l ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-400 bg-white text-ink-700'
                  }`}
                >
                  <input type="radio" name="export-lang" value={l} checked={lang === l} onChange={() => setLang(l)} className="sr-only" />
                  {l === 'en' ? t('english') : t('bangla')}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={onExport}
            disabled={exporter.isPending || !data?.totalParticipants}
            className={`${primaryBtn} flex-1 whitespace-nowrap`}
            aria-describedby="export-hint"
          >
            {exporter.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {exporter.isPending ? t('exporting') : t('exportButton')}
          </button>
        </div>
        <p id="export-hint" className="mt-2 text-xs text-ink-600">{t('exportHint')}</p>
        <p role="status" className="mt-1 text-sm font-medium text-brand-700">{done}</p>
        {exportError && <ErrorNote lang={exportError.lang}>{exportError.text}</ErrorNote>}
      </div>
    );
  }
}
