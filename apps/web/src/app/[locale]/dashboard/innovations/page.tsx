'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useMyInnovations, useDeleteInnovation } from '@/hooks/use-innovations';
import { StagePill } from '@/components/ui/stage-pill';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-ink-50 text-ink-500',
  UNDER_REVIEW: 'bg-sun-100 text-sun-600',
  AUTHENTICITY_REVIEW: 'bg-blue-50 text-blue-600',
  SHORTLISTED: 'bg-clay-50 text-clay-600',
  SELECTED: 'bg-brand-100 text-brand-700',
  APPROVED: 'bg-brand-100 text-brand-800',
  REJECTED: 'bg-red-50 text-red-600',
  PUBLISHED: 'bg-brand-100 text-brand-800',
  UNPUBLISHED: 'bg-sun-100 text-sun-700',
  ARCHIVED: 'bg-ink-50 text-ink-400',
};

// The submitter's own view of the pipeline is intentionally simpler than the internal
// ReviewStatus stages reviewers/admins see, and each stage now gets its own distinct label and
// color: a Primary Reviewer pass (-> AUTHENTICITY_REVIEW) reads "Longlisted" (blue), an
// Authenticity Reviewer pass (-> SHORTLISTED) reads "Midlisted" (clay), and an Expert Evaluator's
// SHORTLIST decision (-> SELECTED) reads "Shortlisted" (brand/green) — see UI_GUIDELINES.md.
const SUBMITTER_STATUS_LABELS: Record<string, string> = {
  AUTHENTICITY_REVIEW: 'LONGLISTED',
  SHORTLISTED: 'MIDLISTED',
  SELECTED: 'SHORTLISTED',
};

function submitterStatusLabel(reviewStatus: string) {
  return SUBMITTER_STATUS_LABELS[reviewStatus] ?? reviewStatus.replace(/_/g, ' ');
}

export default function MyInnovationsPage() {
  const { data, isLoading } = useMyInnovations() as { data: any[]; isLoading: boolean };
  const deleteInnovation = useDeleteInnovation();
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; titleEn: string } | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">My innovations</h1>
        <Link href="/submit" className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> New submission
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {data?.map((innovation) => {
          const isDraft = innovation.reviewStatus === 'DRAFT';
          return (
            <div
              key={innovation.id}
              className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/dashboard/innovations/${innovation.id}`} className="focus-ring min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-400">{innovation.innovationCode}</p>
                <h2 className="mt-1 truncate font-display text-base font-bold text-ink-900">{innovation.titleEn}</h2>
                {innovation.challenge && (
                  <p className="mt-0.5 truncate text-xs font-medium text-brand-700">Challenge: {innovation.challenge.titleEn}</p>
                )}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[innovation.reviewStatus]}`}>
                  {submitterStatusLabel(innovation.reviewStatus)}
                </span>
                <StagePill stage={innovation.developmentStage} />
                {isDraft && (
                  <>
                    <Link
                      href={`/dashboard/innovations/${innovation.id}/edit`}
                      className="focus-ring inline-flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ id: innovation.id, titleEn: innovation.titleEn })}
                      className="focus-ring inline-flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-500 hover:border-red-300 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!isLoading && data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
            You haven't submitted any innovations yet.{' '}
            <Link href="/submit" className="font-semibold text-brand-700 hover:underline">Submit your first one</Link>.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this draft?"
        description={`"${confirmDelete?.titleEn}" will be permanently deleted, along with its photos, documents, and team members. This cannot be undone.`}
        confirmLabel="Delete draft"
        pending={deleteInnovation.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await deleteInnovation.mutateAsync(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
