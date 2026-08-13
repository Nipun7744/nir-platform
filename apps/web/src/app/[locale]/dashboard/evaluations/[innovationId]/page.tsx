'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/navigation';
import { ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Mail, Phone, Building2, User as UserIcon, FileText } from 'lucide-react';
import { useInnovation } from '@/hooks/use-repository-search';
import { useSubmitEvaluation, useFlagIp, useEvaluationsForInnovation } from '@/hooks/use-evaluations';
import { useSubmitterProfile } from '@/hooks/use-submitter-profile';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { ReviewCommentTimeline } from '@/components/reviews/review-comment-timeline';

const RUBRIC = ['Innovativeness', 'Feasibility', 'Impact', 'Scalability'];

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

function SubmitterProfileCard({ userId }: { userId: string }) {
  const { data: profile, isLoading, isError } = useSubmitterProfile(userId) as {
    data?: any;
    isLoading: boolean;
    isError: boolean;
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Submitter profile</h3>

      {isLoading && <p className="mt-3 text-sm text-ink-400">Loading…</p>}
      {isError && <p className="mt-3 text-sm text-ink-400">Unable to load submitter profile.</p>}

      {profile && (
        <>
          <div className="mt-3 flex items-center gap-3">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full border border-ink-100 object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-300">
                <UserIcon className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{profile.fullName}</p>
              {(profile.designation || profile.institution) && (
                <p className="truncate text-xs text-ink-500">
                  {[profile.designation, profile.institution].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-xs">
            <div className="flex items-center gap-2 text-ink-700">
              <Mail className="h-3.5 w-3.5 text-brand-600" /> {profile.email}
            </div>
            {profile.phone && (
              <div className="flex items-center gap-2 text-ink-700">
                <Phone className="h-3.5 w-3.5 text-brand-600" /> {profile.phone}
              </div>
            )}
            {profile.innovatorProfile?.organization?.name && (
              <div className="flex items-center gap-2 text-ink-700">
                <Building2 className="h-3.5 w-3.5 text-brand-600" /> {profile.innovatorProfile.organization.name}
              </div>
            )}
          </dl>

          {profile.innovatorProfile?.irn && (
            <p className="mt-3 font-mono text-[11px] text-ink-400">
              {profile.innovatorProfile.irn}
              {profile.innovatorProfile.nidVerified ? ' · NID verified' : ''}
            </p>
          )}

          {profile.innovatorProfile?.bio && (
            <p className="mt-3 text-xs leading-relaxed text-ink-600">{profile.innovatorProfile.bio}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function EvaluationFormPage({ params }: { params: { innovationId: string } }) {
  const { innovationId } = params;
  const router = useRouter();
  const user = useRequireAuth();
  const { data: innovation, isLoading } = useInnovation(innovationId) as { data: any; isLoading: boolean };
  const { data: existingEvaluations, isLoading: loadingEvaluations } = useEvaluationsForInnovation(innovationId) as {
    data: any[];
    isLoading: boolean;
  };
  const submitEvaluation = useSubmitEvaluation();
  const flagIp = useFlagIp();

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(RUBRIC.map((r) => [r, 5])),
  );
  const [comments, setComments] = useState('');

  if (isLoading || loadingEvaluations) return <p className="text-ink-400">Loading…</p>;
  if (!innovation) return <p className="text-ink-400">Innovation not found.</p>;

  const myEvaluation = existingEvaluations?.find((e) => e.evaluatorId === user?.id);

  const photo = innovation.attachments?.find((a: any) => a.kind === 'PHOTO');
  const documents = innovation.attachments?.filter((a: any) => a.kind !== 'PHOTO') ?? [];

  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/evaluations" className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to my evaluations
      </Link>

      <p className="font-mono text-xs uppercase tracking-wide text-ink-400">{innovation.innovationCode}</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-900">{innovation.titleEn}</h1>
      <p className="mt-2 max-w-2xl text-ink-600">{innovation.summaryEn}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {photo && (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-ink-100">
              <Image src={photo.url} alt={photo.caption ?? innovation.titleEn} fill className="object-cover" sizes="700px" />
            </div>
          )}

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

          {documents.length > 0 && (
            <section>
              <h2 className="font-display text-base font-bold text-ink-900">Supporting documents</h2>
              <div className="mt-2 space-y-2">
                {documents.map((a: any) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    <FileText className="h-4 w-4" /> {a.caption ?? a.kind}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <SubmitterProfileCard userId={innovation.submittedById} />

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Innovation details</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Category</dt>
                <dd className="text-right font-medium text-ink-800">{innovation.category?.nameEn}</dd>
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

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Review history</h3>
            <div className="mt-3">
              <ReviewCommentTimeline
                innovationId={innovationId}
                stages={['PRELIMINARY_REVIEW', 'AUTHENTICITY_REVIEW']}
                emptyText="No preliminary review or authenticity review notes."
              />
            </div>
          </div>

          {innovation.team?.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Innovation team</h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {innovation.team.map((member: any) => (
                  <li key={member.id} className="flex items-center justify-between">
                    <span className="font-medium text-ink-800">{member.displayName}</span>
                    <span className="text-xs text-ink-500">{member.roleInTeam}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {myEvaluation ? (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <p className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-700">
            <CheckCircle2 className="h-4 w-4" /> You already submitted an evaluation for this innovation
            {myEvaluation.submittedAt ? ` on ${new Date(myEvaluation.submittedAt).toLocaleDateString()}` : ''}.
          </p>
          <h2 className="mt-6 font-display text-lg font-bold text-ink-900">Your scores</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(myEvaluation.scores ?? {}).map(([criterion, value]) => (
              <div key={criterion} className="flex justify-between">
                <span className="text-ink-500">{criterion}</span>
                <span className="font-semibold text-ink-800">{value as number}/10</span>
              </div>
            ))}
          </div>
          {myEvaluation.comments && (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink-700">Comments</p>
              <p className="mt-1 text-sm text-ink-600">{myEvaluation.comments}</p>
            </div>
          )}
          <div className="mt-4">
            <p className="text-sm font-medium text-ink-700">Recommendation</p>
            <p className="mt-1 text-sm text-ink-800">{readableLabel(myEvaluation.recommendation)}</p>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="font-display text-lg font-bold text-ink-900">Scoring rubric</h2>
          <div className="mt-4 space-y-5">
            {RUBRIC.map((criterion) => (
              <div key={criterion}>
                <div className="flex justify-between text-sm">
                  <label className="font-medium text-ink-700">{criterion}</label>
                  <span className="font-semibold text-brand-700">{scores[criterion]}/10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={scores[criterion]}
                  onChange={(e) => setScores((s) => ({ ...s, [criterion]: Number(e.target.value) }))}
                  className="mt-1 w-full accent-brand-600"
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="mb-1 block text-sm font-medium text-ink-700">Comments</label>
            <textarea
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
            />
          </div>

          {submitEvaluation.isError && (
            <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
              {(submitEvaluation.error as any)?.message ?? 'Failed to submit evaluation.'}
            </p>
          )}

          <p className="mt-6 text-sm font-medium text-ink-700">Decision</p>
          <p className="mt-0.5 text-xs text-ink-500">
            Shortlisting immediately forwards this innovation to Admin; rejecting immediately ends its review.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              onClick={() =>
                submitEvaluation.mutate(
                  { innovationId, scores, comments, recommendation: 'SHORTLIST' },
                  { onSuccess: () => router.push('/dashboard/evaluations') },
                )
              }
              disabled={submitEvaluation.isPending}
              className="focus-ring rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Shortlist
            </button>
            <button
              onClick={() =>
                submitEvaluation.mutate(
                  { innovationId, scores, comments, recommendation: 'REJECT' },
                  { onSuccess: () => router.push('/dashboard/evaluations') },
                )
              }
              disabled={submitEvaluation.isPending}
              className="focus-ring rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Reject
            </button>
            <button
              onClick={() => flagIp.mutate({ innovationId, note: 'Flagged during evaluation for IP advisory review.' })}
              disabled={flagIp.isPending || flagIp.isSuccess}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-clay-400 disabled:opacity-60"
            >
              <ShieldAlert className="h-4 w-4" /> {flagIp.isSuccess ? 'Flagged for IP review' : 'Flag for IP advisory'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
