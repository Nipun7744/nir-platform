'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useModerationQueue, useEvaluators, useAssignPanel } from '@/hooks/use-moderation';
import { useUpdateInnovationStatus } from '@/hooks/use-innovations';
import { useCategories } from '@/hooks/use-content';

const STATUS_FILTERS = ['', 'UNDER_REVIEW', 'AUTHENTICITY_REVIEW', 'SHORTLISTED', 'SELECTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'];

// SHORTLISTED -> SELECTED is intentionally absent here: that transition is now the Expert
// Evaluator's own SHORTLIST decision (apps/api/src/evaluations/evaluations.service.ts), fired
// automatically the moment they submit — there is no generic admin "Move to SELECTED" action
// representing it. REJECTED/ARCHIVED remain available from SHORTLISTED as manual admin overrides
// for edge cases outside the normal evaluator flow.
//
// SELECTED -> APPROVED is normally made through the Admin Evaluations detail page's "Save approval
// decisions" (which actually records the Recognition/Mentor/Fund decision, not just a bare status
// flip — see InnovationsService.updateApproval) — it's kept here too only as a manual fallback for
// innovations with no Recognition/Mentor/Fund request at all, where that page shows no action
// button. APPROVED -> PUBLISHED remains this page's only current path (Admin Approval and
// Publication are deliberately separate events — see PROJECT_CONTEXT.md#business-rules; a
// dedicated "Publish" action may replace this generic one later, but doesn't exist yet).
const NEXT_STATUS: Record<string, string[]> = {
  UNDER_REVIEW: ['AUTHENTICITY_REVIEW', 'REJECTED', 'ARCHIVED'],
  AUTHENTICITY_REVIEW: ['SHORTLISTED', 'REJECTED', 'ARCHIVED'],
  SHORTLISTED: ['REJECTED', 'ARCHIVED'],
  SELECTED: ['APPROVED', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'ARCHIVED'],
  REJECTED: ['UNDER_REVIEW', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: ['UNDER_REVIEW'],
};

function ModerationRow({ innovation }: { innovation: any }) {
  const { data: evaluators } = useEvaluators() as { data: any[] };
  const { data: categories } = useCategories();
  const assignPanel = useAssignPanel();
  const updateStatus = useUpdateInnovationStatus(innovation.id);
  const [evaluatorId, setEvaluatorId] = useState('');

  const categoryName = (id: string) => categories?.find((c) => c.id === id)?.nameEn ?? id;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-400">
            {innovation.innovationCode} · {innovation.category?.nameEn}
          </p>
          <Link href={`/repository/${innovation.slug}`} className="font-display text-base font-bold text-ink-900 hover:text-brand-700">
            {innovation.titleEn}
          </Link>
        </div>
        <span className="rounded-full bg-sun-100 px-2.5 py-1 text-xs font-semibold text-sun-600">
          {innovation.reviewStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-ink-500">Assign an evaluator</p>
        <div className="flex flex-wrap gap-2">
          {evaluators?.map((e) => {
            const categoryIds: string[] = e.evaluatorCategoryIds ?? [];
            const matchesCategory = categoryIds.includes(innovation.categoryId);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setEvaluatorId(e.id)}
                className={`focus-ring rounded-lg border px-3 py-2 text-left text-sm transition ${
                  evaluatorId === e.id
                    ? 'border-brand-400 bg-brand-50'
                    : matchesCategory
                      ? 'border-brand-200 hover:border-brand-300'
                      : 'border-ink-100 hover:border-ink-300'
                }`}
              >
                <span className="block font-medium text-ink-800">{e.fullName}</span>
                <span className="block text-xs text-ink-500">
                  {categoryIds.length ? categoryIds.map(categoryName).join(', ') : 'No category set'}
                </span>
              </button>
            );
          })}
          {evaluators?.length === 0 && <p className="text-sm text-ink-400">No evaluators available.</p>}
        </div>
        <button
          disabled={!evaluatorId || assignPanel.isPending}
          onClick={() => assignPanel.mutate({ innovationId: innovation.id, evaluatorId })}
          className="focus-ring mt-2 rounded-lg bg-ink-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Assign
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(NEXT_STATUS[innovation.reviewStatus] ?? []).map((status) => (
          <button
            key={status}
            onClick={() => updateStatus.mutate({ reviewStatus: status })}
            disabled={updateStatus.isPending}
            className="focus-ring rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-700 disabled:opacity-40"
          >
            Move to {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ModerationPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useModerationQueue(status || undefined) as { data: any[]; isLoading: boolean };

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Moderation queue</h1>
      <p className="mt-1 text-ink-600">Assign evaluators and move submissions through the review pipeline.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              status === s ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600'
            }`}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {data?.map((innovation) => <ModerationRow key={innovation.id} innovation={innovation} />)}
        {!isLoading && data?.length === 0 && <p className="text-ink-400">Nothing in this queue.</p>}
      </div>
    </div>
  );
}
