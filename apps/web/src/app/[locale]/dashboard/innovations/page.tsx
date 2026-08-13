'use client';

import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';
import { useMyInnovations } from '@/hooks/use-innovations';
import { StagePill } from '@/components/ui/stage-pill';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-ink-50 text-ink-500',
  UNDER_REVIEW: 'bg-sun-100 text-sun-600',
  AUTHENTICITY_REVIEW: 'bg-blue-50 text-blue-600',
  SHORTLISTED: 'bg-clay-50 text-clay-600',
  SELECTED: 'bg-brand-100 text-brand-700',
  APPROVED: 'bg-brand-100 text-brand-800',
  REJECTED: 'bg-red-50 text-red-600',
  PUBLISHED: 'bg-brand-100 text-brand-800',
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
        {data?.map((innovation) => (
          <Link
            key={innovation.id}
            href={`/dashboard/innovations/${innovation.id}`}
            className="focus-ring flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-400">{innovation.innovationCode}</p>
              <h2 className="mt-1 font-display text-base font-bold text-ink-900">{innovation.titleEn}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[innovation.reviewStatus]}`}>
                {submitterStatusLabel(innovation.reviewStatus)}
              </span>
              <StagePill stage={innovation.developmentStage} />
            </div>
          </Link>
        ))}
        {!isLoading && data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
            You haven't submitted any innovations yet.{' '}
            <Link href="/submit" className="font-semibold text-brand-700 hover:underline">Submit your first one</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
