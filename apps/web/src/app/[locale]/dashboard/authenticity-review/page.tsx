'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuthenticityReviewQueue } from '@/hooks/use-authenticity-review';
import { useUpdateInnovationStatus } from '@/hooks/use-innovations';
import { ReviewCommentTimeline } from '@/components/reviews/review-comment-timeline';

const TABS = [
  { value: 'AUTHENTICITY_REVIEW', label: 'Pending review' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'REJECTED', label: 'Rejected' },
];

function AuthenticityReviewRow({ innovation, readOnly }: { innovation: any; readOnly: boolean }) {
  const updateStatus = useUpdateInnovationStatus(innovation.id);
  // Always starts empty — innovation.reviewRemarks at this point may still hold the Preliminary
  // Reviewer's note (see ReviewCommentTimeline above for that history); the Authenticator writes
  // their own note fresh rather than editing/inheriting the previous stage's text.
  const [remarks, setRemarks] = useState('');

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
          <p className="mt-1 line-clamp-2 text-sm text-ink-600">{innovation.summaryEn}</p>
        </div>
        <span className="rounded-full bg-sun-100 px-2.5 py-1 text-xs font-semibold text-sun-600">
          {innovation.reviewStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-ink-500">Preliminary reviewer notes</p>
        <ReviewCommentTimeline
          innovationId={innovation.id}
          stages={['PRELIMINARY_REVIEW']}
          emptyText="No preliminary review notes."
        />
      </div>

      {readOnly ? (
        innovation.reviewRemarks && (
          <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
            <span className="font-semibold text-ink-700">Authenticator notes: </span>
            {innovation.reviewRemarks}
          </p>
        )
      ) : (
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-ink-500">
            Authenticator notes (authenticity, originality, duplication check)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Note what you checked — authenticity, originality, duplication against existing submissions — and why you're shortlisting or rejecting…"
            rows={2}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ reviewStatus: 'SHORTLISTED', note: remarks || undefined })}
              className="focus-ring rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Midlist
            </button>
            <button
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ reviewStatus: 'REJECTED', note: remarks || undefined })}
              className="focus-ring rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthenticityReviewPage() {
  const [status, setStatus] = useState('AUTHENTICITY_REVIEW');
  const { data, isLoading } = useAuthenticityReviewQueue(status) as { data: any[]; isLoading: boolean };

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Authenticity review</h1>
      <p className="mt-1 text-ink-600">
        Verify that each submission in your assigned categories is authentic, original, and not a duplicate or
        redundant idea. Only innovations you midlist here move on to Expert Evaluators; rejected ones stay here.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              status === t.value ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {data?.map((innovation) => (
          <AuthenticityReviewRow key={innovation.id} innovation={innovation} readOnly={status !== 'AUTHENTICITY_REVIEW'} />
        ))}
        {!isLoading && data?.length === 0 && (
          <p className="text-ink-400">
            Nothing here.{' '}
            {status === 'AUTHENTICITY_REVIEW'
              ? 'No pending submissions in your assigned categories.'
              : status === 'REVIEWED'
                ? 'No shortlisted submissions yet.'
                : 'No rejected submissions yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
