'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Search, X } from 'lucide-react';
import { useAssignedEvaluations } from '@/hooks/use-evaluations';
import { useModerationQueue } from '@/hooks/use-moderation';
import { useHasRole } from '@/hooks/use-require-auth';
import { Role } from '@nir/shared';

function matchesQuery(innovation: any, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    innovation.titleEn,
    innovation.innovationCode,
    innovation.id,
    innovation.category?.nameEn,
    innovation.category?.nameBn,
  ].some((field) => typeof field === 'string' && field.toLowerCase().includes(q));
}

function InnovationRow({ innovation, autoMatched }: { innovation: any; autoMatched?: boolean }) {
  return (
    <Link
      href={`/dashboard/evaluations/${innovation.id}`}
      className="focus-ring flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-400">{innovation.innovationCode} · {innovation.category?.nameEn}</p>
        <h2 className="mt-1 font-display text-base font-bold text-ink-900">{innovation.titleEn}</h2>
      </div>
      <div className="flex items-center gap-2">
        {autoMatched && (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            Category match
          </span>
        )}
        <span className="rounded-full bg-sun-100 px-2.5 py-1 text-xs font-semibold text-sun-600">
          {innovation.reviewStatus.replace(/_/g, ' ')}
        </span>
      </div>
    </Link>
  );
}

export default function EvaluationsPage() {
  const canSeeAllSubmitted = useHasRole(Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN);
  const [tab, setTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [query, setQuery] = useState('');
  const { data: assigned, isLoading: loadingAssigned } = useAssignedEvaluations() as { data: any[]; isLoading: boolean };
  const { data: allSubmitted, isLoading: loadingAll } = useModerationQueue(undefined, { enabled: canSeeAllSubmitted }) as { data: any[]; isLoading: boolean };
  const activeTab = canSeeAllSubmitted ? tab : tab === 'all' ? 'pending' : tab;

  const pending = useMemo(() => assigned?.filter((assignment) => !assignment.evaluationSubmitted), [assigned]);
  const completed = useMemo(() => assigned?.filter((assignment) => assignment.evaluationSubmitted), [assigned]);

  const filteredPending = useMemo(
    () => pending?.filter((assignment) => matchesQuery(assignment.innovation, query)),
    [pending, query],
  );
  const filteredCompleted = useMemo(
    () => completed?.filter((assignment) => matchesQuery(assignment.innovation, query)),
    [completed, query],
  );
  const filteredAllSubmitted = useMemo(
    () => allSubmitted?.filter((innovation) => matchesQuery(innovation, query)),
    [allSubmitted, query],
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Evaluations</h1>
      <p className="mt-1 text-ink-600">Review innovations assigned to you, or browse everything submitted so far.</p>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2.5 shadow-card sm:max-w-md">
        <Search className="h-4 w-4 shrink-0 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, category, or NIR ID…"
          className="w-full bg-transparent text-sm focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear search">
            <X className="h-4 w-4 text-ink-400" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
            activeTab === 'pending' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600'
          }`}
        >
          Pending Evaluations
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
            activeTab === 'completed' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600'
          }`}
        >
          Completed Evaluations
        </button>
        {canSeeAllSubmitted && (
          <button
            onClick={() => setTab('all')}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              activeTab === 'all' ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600'
            }`}
          >
            All submitted
          </button>
        )}
      </div>

      {activeTab === 'pending' && (
        <div className="mt-6 space-y-3">
          {loadingAssigned && <p className="text-ink-400">Loading…</p>}
          {filteredPending?.map((assignment) => (
            <InnovationRow key={assignment.id} innovation={assignment.innovation} autoMatched={assignment.autoMatched} />
          ))}
          {!loadingAssigned && pending?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
              No pending evaluations. You&apos;re all caught up.
            </div>
          )}
          {!loadingAssigned && (pending?.length ?? 0) > 0 && filteredPending?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
              No matches for "{query}".
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="mt-6 space-y-3">
          {loadingAssigned && <p className="text-ink-400">Loading…</p>}
          {filteredCompleted?.map((assignment) => (
            <InnovationRow key={assignment.id} innovation={assignment.innovation} autoMatched={assignment.autoMatched} />
          ))}
          {!loadingAssigned && completed?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
              You haven&apos;t completed any evaluations yet.
            </div>
          )}
          {!loadingAssigned && (completed?.length ?? 0) > 0 && filteredCompleted?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
              No matches for "{query}".
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="mt-6 space-y-3">
          {loadingAll && <p className="text-ink-400">Loading…</p>}
          {filteredAllSubmitted?.map((innovation) => <InnovationRow key={innovation.id} innovation={innovation} />)}
          {!loadingAll && allSubmitted?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
              Nothing has been submitted yet.
            </div>
          )}
          {!loadingAll && (allSubmitted?.length ?? 0) > 0 && filteredAllSubmitted?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
              No matches for "{query}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
