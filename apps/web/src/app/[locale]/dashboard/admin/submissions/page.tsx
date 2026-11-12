'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { AlertCircle, Inbox, Search, Trophy } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ReviewStatus, SubmissionChannel } from '@nir/shared';
import { useAdminChallenges, useSubmissions, type SubmissionFilters } from '@/hooks/use-admin';
import { useSubmissionSettings, useUpdateSubmissionSettings } from '@/hooks/use-settings';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

const REVIEW_STATUSES = Object.values(ReviewStatus);

const EMPTY_FILTERS: SubmissionFilters = {
  channel: '',
  challengeId: '',
  reviewStatus: '',
  q: '',
  fromDate: '',
  toDate: '',
  page: 1,
  pageSize: 20,
};

// Reviewer/admin-facing page — shows the real internal ReviewStatus names (see UI_GUIDELINES.md).
const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-ink-50 text-ink-500',
  UNDER_REVIEW: 'bg-sun-50 text-sun-600',
  AUTHENTICITY_REVIEW: 'bg-blue-50 text-blue-600',
  SHORTLISTED: 'bg-clay-50 text-clay-600',
  SELECTED: 'bg-brand-100 text-brand-700',
  APPROVED: 'bg-brand-100 text-brand-800',
  REJECTED: 'bg-red-50 text-red-600',
  PUBLISHED: 'bg-brand-100 text-brand-800',
  UNPUBLISHED: 'bg-sun-100 text-sun-600',
  ARCHIVED: 'bg-ink-50 text-ink-400',
};

const inputCls = 'focus-ring w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm';

function GeneralSubmissionCard() {
  const { data, isLoading } = useSubmissionSettings();
  const update = useUpdateSubmissionSettings();
  const [confirm, setConfirm] = useState(false);
  const enabled = data?.generalSubmissionEnabled ?? false;

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-display text-base font-bold text-ink-900">General innovation submission</h2>
          <p className="mt-1 text-sm text-ink-600">
            Controls the public &ldquo;Submit an Innovation&rdquo; option (header, homepage, footer and <span className="font-mono text-xs">/submit</span>).
            When off, the option is hidden and the API refuses new general submissions. Challenge submissions are controlled per challenge and are not affected.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', enabled ? 'bg-brand-100 text-brand-700' : 'bg-red-50 text-red-600')}>
            {isLoading ? '…' : enabled ? 'Active' : 'Inactive'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="General innovation submission"
            disabled={isLoading || update.isPending}
            onClick={() => setConfirm(true)}
            className={clsx(
              'focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50',
              enabled ? 'bg-brand-600' : 'bg-red-500',
            )}
          >
            <span className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow transition', enabled ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
      </div>
      {update.isError && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> Could not update the setting.
        </p>
      )}
      <ConfirmDialog
        open={confirm}
        title={enabled ? 'Deactivate general submission?' : 'Activate general submission?'}
        description={
          enabled
            ? 'The public "Submit an Innovation" option will be hidden and new general submissions will be refused. Innovations already in review are not affected.'
            : 'The public "Submit an Innovation" option will be shown again and anyone registered can submit.'
        }
        confirmLabel={enabled ? 'Deactivate' : 'Activate'}
        danger={enabled}
        pending={update.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => update.mutate({ generalSubmissionEnabled: !enabled }, { onSettled: () => setConfirm(false) })}
      />
    </section>
  );
}

function SubmissionsMonitor() {
  const searchParams = useSearchParams();
  const { data: challenges } = useAdminChallenges() as { data: any[] | undefined };
  const [filters, setFilters] = useState<SubmissionFilters>(() => {
    const challengeId = searchParams.get('challengeId') ?? '';
    return { ...EMPTY_FILTERS, challengeId, channel: challengeId ? SubmissionChannel.CHALLENGE : '' };
  });
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching } = useSubmissions(filters);
  const set = (patch: Partial<SubmissionFilters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-ink-900">Submission monitoring</h2>
      <p className="mt-1 text-sm text-ink-600">All submitted innovations across both channels. Open one to follow it through the review workflow.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <form
          className="relative sm:col-span-2 lg:col-span-3"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: search.trim() });
          }}
        >
          <label htmlFor="sub-q" className="sr-only">Search by submitter, title or code</label>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
          <input
            id="sub-q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => search.trim() !== filters.q && set({ q: search.trim() })}
            placeholder="Search submitter name/email, title or NIR code — press Enter"
            className={clsx(inputCls, 'pl-9')}
          />
        </form>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Channel</span>
          <select value={filters.channel} onChange={(e) => set({ channel: e.target.value, ...(e.target.value === 'GENERAL' ? { challengeId: '' } : {}) })} className={inputCls}>
            <option value="">All channels</option>
            <option value={SubmissionChannel.GENERAL}>General submission</option>
            <option value={SubmissionChannel.CHALLENGE}>Challenge submission</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Challenge</span>
          <select
            value={filters.challengeId}
            onChange={(e) => set({ challengeId: e.target.value, ...(e.target.value ? { channel: SubmissionChannel.CHALLENGE } : {}) })}
            className={inputCls}
          >
            <option value="">All challenges</option>
            {challenges?.map((c) => (
              <option key={c.id} value={c.id}>{c.titleEn}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Review status</span>
          <select value={filters.reviewStatus} onChange={(e) => set({ reviewStatus: e.target.value })} className={inputCls}>
            <option value="">All (excluding drafts)</option>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Submitted from</span>
          <input type="date" value={filters.fromDate} onChange={(e) => set({ fromDate: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Submitted to</span>
          <input type="date" value={filters.toDate} onChange={(e) => set({ toDate: e.target.value })} className={inputCls} />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilters({ ...EMPTY_FILTERS, pageSize: filters.pageSize });
            }}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-600 hover:border-ink-300"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className={clsx('mt-5 overflow-x-auto', isFetching && 'opacity-70')}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <th className="py-2 pr-3 font-semibold">Innovation</th>
              <th className="py-2 pr-3 font-semibold">Channel</th>
              <th className="py-2 pr-3 font-semibold">Submitted by</th>
              <th className="py-2 pr-3 font-semibold">Submitted</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="py-6 text-center text-ink-400">Loading…</td></tr>
            )}
            {data?.items?.map((i: any) => (
              <tr key={i.id} className="border-b border-ink-50 align-top">
                <td className="py-3 pr-3">
                  <Link href={`/repository/${i.slug}`} className="font-medium text-ink-900 hover:text-brand-700">{i.titleEn}</Link>
                  <p className="font-mono text-xs text-ink-400">{i.innovationCode} · {i.category?.nameEn}</p>
                </td>
                <td className="py-3 pr-3">
                  {i.submissionChannel === SubmissionChannel.CHALLENGE ? (
                    <span className="inline-flex items-start gap-1 text-xs font-medium text-brand-700">
                      <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {i.challenge?.titleEn ?? 'Challenge'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-ink-500">General</span>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <p className="text-ink-800">{i.submittedBy?.fullName ?? '—'}</p>
                  <p className="text-xs text-ink-400">{i.submittedBy?.email}</p>
                </td>
                <td className="whitespace-nowrap py-3 pr-3 text-ink-600">
                  {i.submittedAt ? new Date(i.submittedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="py-3">
                  <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLES[i.reviewStatus])}>
                    {i.reviewStatus.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-ink-400">
                  <Inbox className="mx-auto mb-2 h-6 w-6" /> No submissions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && (
        <div className="mt-4">
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            pageSizeOptions={[20, 50, 100]}
            onPageSizeChange={(pageSize) => set({ pageSize })}
          />
        </div>
      )}
    </section>
  );
}

export default function AdminSubmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Submission management</h1>
        <p className="mt-1 text-sm text-ink-600">
          Control the general submission channel and monitor every submission. Challenges, their submission switches and forms are managed under{' '}
          <Link href="/dashboard/admin" className="font-semibold text-brand-700 hover:underline">Platform admin → Challenges</Link>.
        </p>
      </div>
      <GeneralSubmissionCard />
      <Suspense fallback={<p className="text-ink-400">Loading…</p>}>
        <SubmissionsMonitor />
      </Suspense>
    </div>
  );
}
