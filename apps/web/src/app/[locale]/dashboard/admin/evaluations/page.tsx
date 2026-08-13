'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ShieldCheck, RotateCcw, CheckCircle2, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useShortlistedEvaluations, useIpFlags } from '@/hooks/use-evaluations';
import { useCategories } from '@/hooks/use-content';

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      {children}
    </div>
  );
}

function monthLabel(dateValue: string | Date) {
  return new Date(dateValue).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByMonth<T extends { submittedAt?: string | null; createdAt: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = monthLabel(item.submittedAt ?? item.createdAt);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

// "Reviewed" reuses Innovation.reviewStatus, the same field the rest of the app already uses to
// track review progress. An Expert Evaluator's SHORTLIST decision now moves the innovation to
// SELECTED immediately (EvaluationsService.submitEvaluation — no separate admin step), so SELECTED
// is exactly "Admin Pending": eligible for, and awaiting, the Admin's own approval decision.
// "Reviewed" is once that decision has actually been made — APPROVED (the normal outcome; note
// this is deliberately NOT the same thing as PUBLISHED, see PROJECT_CONTEXT.md#business-rules) or,
// later, PUBLISHED/ARCHIVED — or, a rarer edge case, REJECTED, which can only reach this list at
// all if a *second* assigned evaluator submitted a SHORTLIST recommendation after a *first*
// evaluator's REJECT had already settled the innovation (submitEvaluation only applies the first
// decision received); such a stray vote belongs in "Reviewed" (settled, not awaiting action), not
// "Pending". Mirrors the reviewStatus=REVIEWED pseudo-status pattern already used on the
// Preliminary/Authenticity Reviewer dashboards, just expressed as a client-side filter since this
// page's data (all shortlisted evaluations, unpaginated) is already fetched in full.
const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
] as const;
const PENDING_STATUS = 'SELECTED';
const REVIEWED_STATUSES = new Set(['APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED']);

function AdminEvaluationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: shortlisted, isLoading: loadingShortlisted } = useShortlistedEvaluations() as { data: any[]; isLoading: boolean };
  const { data: ipFlags, isLoading: loadingIpFlags } = useIpFlags() as { data: any[]; isLoading: boolean };
  const { data: categories } = useCategories();

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['value']>('PENDING');
  const [categoryId, setCategoryId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [showSavedBanner, setShowSavedBanner] = useState(false);

  // Arriving here via the Approval Decision save's redirect (?saved=1) — show a one-time success
  // notification, then strip the query param so it doesn't reappear on refresh/back-navigation.
  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      setShowSavedBanner(true);
      router.replace('/dashboard/admin/evaluations');
      const timer = setTimeout(() => setShowSavedBanner(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);
  const [toDate, setToDate] = useState('');

  const isLoading = loadingShortlisted || loadingIpFlags;
  const flagsByInnovationId = new Map<string, any[]>();
  for (const flag of ipFlags ?? []) {
    const list = flagsByInnovationId.get(flag.innovation.id) ?? [];
    list.push(flag);
    flagsByInnovationId.set(flag.innovation.id, list);
  }

  const shortlistedInnovationIds = new Set((shortlisted ?? []).map((e) => e.innovation.id));
  const otherFlags = (ipFlags ?? []).filter((f) => !shortlistedInnovationIds.has(f.innovation.id));

  const hasActiveFilters = Boolean(categoryId || fromDate || toDate);
  const clearFilters = () => {
    setCategoryId('');
    setFromDate('');
    setToDate('');
  };

  const filteredShortlisted = useMemo(() => {
    // Local-time day boundaries so "01 Aug – 10 Aug" includes everything on both endpoint days,
    // regardless of the time-of-day component on the underlying submittedAt/createdAt timestamp.
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return (shortlisted ?? []).filter((evaluation) => {
      const status = evaluation.innovation.reviewStatus;
      const tabMatch = activeTab === 'PENDING' ? status === PENDING_STATUS : REVIEWED_STATUSES.has(status);
      if (!tabMatch) return false;
      if (categoryId && evaluation.innovation.category?.id !== categoryId) return false;
      const itemDate = new Date(evaluation.submittedAt ?? evaluation.createdAt);
      if (from && itemDate < from) return false;
      if (to && itemDate > to) return false;
      return true;
    });
  }, [shortlisted, activeTab, categoryId, fromDate, toDate]);

  const monthGroups = groupByMonth(filteredShortlisted);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Evaluations</h1>
      <p className="mt-1 text-ink-600">
        Innovations shortlisted by expert evaluators, grouped by month, with intellectual-property advisory status for each.
      </p>

      {showSavedBanner && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Approval decision saved successfully.
          </span>
          <button
            type="button"
            onClick={() => setShowSavedBanner(false)}
            aria-label="Dismiss"
            className="focus-ring rounded-full p-1 text-brand-600 hover:bg-brand-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`focus-ring rounded-full border px-3 py-1.5 text-sm font-medium ${
              activeTab === t.value ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Date range</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
              className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
            />
            <span className="text-ink-400">–</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
              className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-600 hover:border-clay-400"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset filters
          </button>
        )}
      </div>

      <div className="mt-6">
        <Panel title="Shortlisted by evaluators">
          <div className="mt-4 space-y-6">
            {isLoading && <p className="text-ink-400">Loading…</p>}
            {monthGroups.map(([month, items]) => (
              <div key={month}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {month} <span className="text-ink-400">· {items.length}</span>
                </h3>
                <div className="mt-2 space-y-2">
                  {items.map((evaluation) => {
                    const flags = flagsByInnovationId.get(evaluation.innovation.id) ?? [];
                    const isFlagged = flags.length > 0;
                    return (
                      <div key={evaluation.id} className="rounded-xl border border-ink-100 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <Link href={`/dashboard/admin/evaluations/${evaluation.innovation.id}`} className="text-sm font-medium text-ink-800 hover:text-brand-700">
                              {evaluation.innovation.titleEn}
                            </Link>
                            <p className="text-xs text-ink-500">
                              {evaluation.innovation.innovationCode} · Shortlisted by {evaluation.evaluator.fullName}
                            </p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              isFlagged ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'
                            }`}
                          >
                            {isFlagged ? <AlertTriangle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                            {isFlagged ? `Flagged for IP review (${flags.length})` : 'No IP flag'}
                          </span>
                        </div>
                        {isFlagged && (
                          <div className="mt-2 space-y-1.5 border-t border-ink-100 pt-2">
                            {flags.map((flag) => (
                              <p key={flag.id} className="text-xs text-ink-600">
                                <span className="font-medium text-ink-700">{flag.flaggedBy.fullName}</span>
                                {flag.note ? `: ${flag.note}` : ' flagged this innovation for IP review.'}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {!isLoading && monthGroups.length === 0 && (
              <p className="text-sm text-ink-400">
                {hasActiveFilters
                  ? 'No innovations match the selected filters.'
                  : activeTab === 'PENDING'
                    ? 'No innovations pending review.'
                    : 'No reviewed innovations yet.'}
              </p>
            )}
          </div>

          {!isLoading && otherFlags.length > 0 && (
            <div className="mt-6 border-t border-ink-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Other IP flags (not shortlisted)
              </h3>
              <div className="mt-2 space-y-2">
                {otherFlags.map((flag) => (
                  <div key={flag.id} className="rounded-xl border border-ink-100 px-4 py-2.5">
                    <Link href={`/dashboard/admin/evaluations/${flag.innovation.id}`} className="text-sm font-medium text-ink-800 hover:text-brand-700">
                      {flag.innovation.titleEn}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {flag.innovation.innovationCode} · Flagged by {flag.flaggedBy.fullName}
                    </p>
                    {flag.note && <p className="mt-1 text-xs text-ink-600">{flag.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function AdminEvaluationsPage() {
  return (
    <Suspense fallback={<p className="text-ink-400">Loading…</p>}>
      <AdminEvaluationsPageContent />
    </Suspense>
  );
}
