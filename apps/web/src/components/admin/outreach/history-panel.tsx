'use client';

import { Fragment, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { History, Mail, MessageSquare } from 'lucide-react';
import { useBulkHistory, useBulkMessageDetail, type BulkMessageSummary, type RecipientStatus } from '@/hooks/use-outreach';
import { Card, ErrorNote, Pager, StatusPill, inputCls, useFormatDate } from './outreach-ui';

const R_STATUSES: RecipientStatus[] = ['SENT', 'FAILED', 'SKIPPED', 'PENDING'];
const R_STYLES: Record<RecipientStatus, string> = {
  PENDING: 'text-ink-600',
  SENT: 'text-brand-700',
  FAILED: 'text-red-700',
  SKIPPED: 'text-amber-deep',
};

function Progress({ m }: { m: BulkMessageSummary }) {
  const t = useTranslations('outreach');
  const done = m.totalRecipients - m.pendingCount;
  const pct = m.totalRecipients ? Math.round((done / m.totalRecipients) * 100) : 100;
  return (
    <div className="mt-1.5">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={m.totalRecipients}
        aria-valuenow={done}
        aria-label={t('progress', { done, total: m.totalRecipients })}
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
      >
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const t = useTranslations('outreach');
  const locale = useLocale();
  const fmt = useFormatDate();
  const [status, setStatus] = useState<RecipientStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isError } = useBulkMessageDetail(id, status, page);
  if (isError) return <ErrorNote>{t('loadError')}</ErrorNote>;
  if (!data) return <p className="text-sm text-ink-600">{t('loading')}</p>;
  const m = data.message;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-ink-100 bg-white p-3 text-sm">
        {m.subject && <p className="font-semibold text-ink-900">{m.subject}</p>}
        <p className="mt-1 whitespace-pre-wrap break-words text-ink-700">{m.body}</p>
      </div>
      <label className="block max-w-xs">
        <span className="sr-only">{t('colStatus')}</span>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RecipientStatus | '');
            setPage(1);
          }}
          className={inputCls}
        >
          <option value="">{t('filterAll')}</option>
          {R_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`rstatus_${s}`)}</option>
          ))}
        </select>
      </label>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-600">
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colName')}</th>
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colAddress')}</th>
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colStatus')}</th>
              <th scope="col" className="py-2 font-semibold">{t('colReason')}</th>
            </tr>
          </thead>
          <tbody>
            {data.recipients.items.map((r) => (
              <tr key={r.id} className="border-b border-ink-50 align-top">
                <td className="py-2 pr-3 text-ink-900">{r.name}</td>
                <td className="break-all py-2 pr-3 text-ink-700">{r.address || '—'}</td>
                <td className={`whitespace-nowrap py-2 pr-3 font-semibold ${R_STYLES[r.status]}`}>{t(`rstatus_${r.status}`)}</td>
                <td className="py-2 text-ink-600">
                  {r.error ? <span lang={locale === 'en' ? undefined : 'en'}>{r.error}</span> : r.sentAt ? fmt(r.sentAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={data.recipients.page} totalPages={data.recipients.totalPages} onPage={setPage} />
    </div>
  );
}

/** Communication log: every bulk send with sender, date, counts and status; expandable per-recipient detail. */
export function HistoryPanel({ challengeId }: { challengeId: string }) {
  const t = useTranslations('outreach');
  const fmt = useFormatDate();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, isError } = useBulkHistory(challengeId, page);

  return (
    <Card id="history-title" title={t('historyTitle')} intro={challengeId ? t('historyIntroChallenge') : t('historyIntroAll')}>
      {isError && <ErrorNote>{t('loadError')}</ErrorNote>}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-600">
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colDate')}</th>
              {!challengeId && <th scope="col" className="py-2 pr-3 font-semibold">{t('colChallenge')}</th>}
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colMessage')}</th>
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colSender')}</th>
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colRecipients')}</th>
              <th scope="col" className="py-2 pr-3 font-semibold">{t('colStatus')}</th>
              <th scope="col" className="py-2 font-semibold"><span className="sr-only">{t('details')}</span></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="py-6 text-center text-ink-600">{t('loading')}</td></tr>
            )}
            {data?.items.map((m) => {
              const Icon = m.channel === 'EMAIL' ? Mail : MessageSquare;
              const expanded = open === m.id;
              return (
                <Fragment key={m.id}>
                  <tr className="border-b border-ink-50 align-top">
                    <td className="whitespace-nowrap py-3 pr-3 text-ink-700">{fmt(m.createdAt)}</td>
                    {!challengeId && <td className="py-3 pr-3 text-ink-700">{m.challengeTitleEn}</td>}
                    <td className="max-w-[260px] py-3 pr-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {m.channel === 'EMAIL' ? t('channelEmail') : t('channelSms')}
                      </span>
                      <p className="truncate text-ink-900">{m.subject ?? m.body}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="text-ink-900">{m.createdBy.fullName}</p>
                      <p className="text-xs text-ink-600">{m.createdBy.email}</p>
                    </td>
                    <td className="py-3 pr-3 text-ink-700">
                      <p className="font-semibold text-ink-900">{m.totalRecipients - m.skippedCount} <span className="font-normal text-ink-600">{t('ofTotal', { total: m.totalRecipients })}</span></p>
                      <p className="text-xs text-ink-600">{t('recipientsCell', { sent: m.sentCount, failed: m.failedCount, skipped: m.skippedCount })}</p>
                    </td>
                    <td className="min-w-[120px] py-3 pr-3">
                      <StatusPill status={m.status} />
                      {(m.status === 'QUEUED' || m.status === 'SENDING') && <Progress m={m} />}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`bulk-detail-${m.id}`}
                        onClick={() => setOpen(expanded ? null : m.id)}
                        className="focus-ring min-h-[36px] rounded-lg border border-ink-400 px-3 text-xs font-semibold text-ink-700 hover:border-ink-600"
                      >
                        {expanded ? t('hideDetails') : t('details')}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr id={`bulk-detail-${m.id}`}>
                      <td colSpan={7} className="bg-mist/60 p-3">
                        <Detail id={m.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-600">
                  <History className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                  {t('noHistory')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </Card>
  );
}
