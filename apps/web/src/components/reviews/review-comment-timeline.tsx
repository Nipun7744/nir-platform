'use client';

import { useReviewComments } from '@/hooks/use-innovations';

const STAGE_LABELS: Record<string, string> = {
  PRELIMINARY_REVIEW: 'Preliminary Reviewer',
  AUTHENTICITY_REVIEW: 'Authenticity Reviewer',
};

export function ReviewCommentTimeline({
  innovationId,
  stages,
  emptyText,
}: {
  innovationId: string;
  stages: string[];
  emptyText?: string;
}) {
  const { data: comments, isLoading } = useReviewComments(innovationId) as { data: any[]; isLoading: boolean };
  const filtered = comments?.filter((c) => stages.includes(c.stage));

  if (isLoading) return <p className="text-xs text-ink-400">Loading notes…</p>;
  if (!filtered || filtered.length === 0) {
    return emptyText ? <p className="text-xs text-ink-400">{emptyText}</p> : null;
  }

  return (
    <div className="space-y-2">
      {filtered.map((c) => (
        <div key={c.id} className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
          <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-ink-500">
            <span className="font-semibold text-ink-700">
              {STAGE_LABELS[c.stage] ?? c.stage}
              {c.author?.fullName ? ` · ${c.author.fullName}` : ''}
            </span>
            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="mt-1">{c.note}</p>
        </div>
      ))}
    </div>
  );
}
