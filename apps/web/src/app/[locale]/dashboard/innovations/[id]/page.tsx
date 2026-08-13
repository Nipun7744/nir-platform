'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { ArrowLeft, ImagePlus, FileText, UserPlus, Send, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useInnovation } from '@/hooks/use-repository-search';
import { useAddAttachment, useAddTeamMember, useSubmitInnovation } from '@/hooks/use-innovations';
import { FileUploadButton } from '@/components/ui/file-upload-button';
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

function readableLabel(value?: string) {
  if (!value) return '—';
  return value.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function RequestBadge({ requested }: { requested: boolean }) {
  return requested ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Requested
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-500">
      <XCircle className="h-3.5 w-3.5" /> Not requested
    </span>
  );
}

export default function ManageInnovationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { data: innovation, isLoading } = useInnovation(id) as { data: any; isLoading: boolean };
  const addAttachment = useAddAttachment(id);
  const addTeamMember = useAddTeamMember(id);
  const submitInnovation = useSubmitInnovation();
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!innovation) return <p className="text-ink-400">Innovation not found.</p>;

  const canEdit = innovation.reviewStatus === 'DRAFT' || innovation.reviewStatus === 'REJECTED';

  return (
    <div>
      <Link href="/dashboard/innovations" className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to my innovations
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[innovation.reviewStatus]}`}>
          {submitterStatusLabel(innovation.reviewStatus)}
        </span>
        <StagePill stage={innovation.developmentStage} />
        <span className="font-mono text-xs text-ink-400">{innovation.innovationCode}</span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink-900">{innovation.titleEn}</h1>
      <p className="mt-2 max-w-2xl text-ink-600">{innovation.summaryEn}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-base font-bold text-ink-900">Problem statement</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{innovation.problemStatement}</p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-ink-900">Proposed solution</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{innovation.proposedSolution}</p>
          </section>

          {innovation.objectives && (
            <section>
              <h2 className="font-display text-base font-bold text-ink-900">Objectives</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{innovation.objectives}</p>
            </section>
          )}

          {innovation.keyFeatures && (
            <section>
              <h2 className="font-display text-base font-bold text-ink-900">Key features</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{innovation.keyFeatures}</p>
            </section>
          )}

          {innovation.targetBeneficiaries && (
            <section>
              <h2 className="font-display text-base font-bold text-ink-900">Target beneficiaries</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{innovation.targetBeneficiaries}</p>
            </section>
          )}

          {innovation.impact && (
            <section>
              <h2 className="font-display text-base font-bold text-ink-900">Impact</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{innovation.impact}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Innovation details</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Category</dt>
                <dd className="text-right font-medium text-ink-800">{innovation.category?.nameEn ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Type</dt>
                <dd className="font-medium text-ink-800">{readableLabel(innovation.innovationType)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Stage</dt>
                <dd className="font-medium text-ink-800">{readableLabel(innovation.developmentStage)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">TRL</dt>
                <dd className="font-medium text-ink-800">{innovation.technologyReadinessLevel ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">IP status</dt>
                <dd className="font-medium text-ink-800">{readableLabel(innovation.ipStatus)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Funding source</dt>
                <dd className="font-medium text-ink-800">{readableLabel(innovation.fundingSource)}</dd>
              </div>
              {innovation.region && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Region</dt>
                  <dd className="font-medium text-ink-800">{innovation.region.nameEn}</dd>
                </div>
              )}
              {innovation.organization && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Organization</dt>
                  <dd className="text-right font-medium text-ink-800">{innovation.organization.name}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Support requested</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Mentorship</dt>
                <dd><RequestBadge requested={Boolean(innovation.mentorshipNeeded)} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Funding</dt>
                <dd><RequestBadge requested={Boolean(innovation.fundingNeeded)} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Recognition</dt>
                <dd><RequestBadge requested={Boolean(innovation.recognitionNeeded)} /></dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <ImagePlus className="h-4 w-4 text-brand-600" /> Attachments
          </h2>
          <div className="mt-3 space-y-2">
            {innovation.attachments?.map((a: any) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 hover:border-brand-300">
                <FileText className="h-4 w-4" /> {a.caption ?? a.kind}
              </a>
            ))}
          </div>
          {canEdit && (
            <div className="mt-3">
              <FileUploadButton
                label="Upload photo, video, or document"
                onUploaded={async (result) => {
                  const kind = result.mimeType.startsWith('image')
                    ? 'PHOTO'
                    : result.mimeType.startsWith('video')
                      ? 'VIDEO'
                      : 'DOCUMENT';
                  await addAttachment.mutateAsync({
                    kind,
                    url: result.url,
                    caption: result.originalName,
                    mimeType: result.mimeType,
                    sizeBytes: result.sizeBytes,
                  });
                }}
              />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <UserPlus className="h-4 w-4 text-brand-600" /> Innovation team
          </h2>
          <ul className="mt-3 space-y-2">
            {innovation.team?.map((m: any) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                <span className="font-medium text-ink-800">{m.displayName}</span>
                <span className="text-xs text-ink-500">{m.roleInTeam}</span>
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="mt-3 flex gap-2">
              <input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Name"
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
              />
              <input
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                placeholder="Team Member"
                className="focus-ring w-40 rounded-lg border border-ink-100 px-3 py-2 text-sm"
              />
              <button
                onClick={async () => {
                  if (!memberName) return;
                  await addTeamMember.mutateAsync({ displayName: memberName, roleInTeam: memberRole || 'Team Member' });
                  setMemberName('');
                  setMemberRole('');
                }}
                className="focus-ring shrink-0 rounded-lg bg-ink-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
          )}
        </section>
      </div>

      {canEdit && (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
          <h2 className="font-display text-base font-bold text-ink-900">Ready for review?</h2>
          <p className="mt-1 text-sm text-ink-600">
            Once submitted, an Institutional Coordinator will assign an evaluator. You won't be able to edit content while it's under review.
          </p>
          <button
            onClick={() => submitInnovation.mutate(id, { onSuccess: () => router.push('/dashboard/innovations') })}
            disabled={submitInnovation.isPending}
            className="focus-ring mt-3 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {submitInnovation.isPending ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      )}
    </div>
  );
}
