'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Mail, Phone, Building2, User as UserIcon, FileText, Upload, Lock } from 'lucide-react';
import { useInnovation } from '@/hooks/use-repository-search';
import { useEvaluationsForInnovation, useIpFlags } from '@/hooks/use-evaluations';
import { useUpdateInnovationApproval } from '@/hooks/use-innovations';
import { useUploadFile } from '@/hooks/use-admin';
import { useSubmitterProfile } from '@/hooks/use-submitter-profile';
import { ReviewCommentTimeline } from '@/components/reviews/review-comment-timeline';

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
        </>
      )}
    </div>
  );
}

function EvaluationsSummaryCard({ innovationId }: { innovationId: string }) {
  const { data: evaluations, isLoading } = useEvaluationsForInnovation(innovationId) as { data: any[]; isLoading: boolean };
  const { data: ipFlags } = useIpFlags() as { data: any[] };
  const flags = (ipFlags ?? []).filter((f) => f.innovation.id === innovationId);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Expert evaluations</h3>
      {isLoading && <p className="mt-3 text-sm text-ink-400">Loading…</p>}
      {!isLoading && (evaluations?.length ?? 0) === 0 && <p className="mt-3 text-sm text-ink-400">No evaluations submitted yet.</p>}
      <ul className="mt-3 space-y-3 text-sm">
        {evaluations?.map((evaluation) => (
          <li key={evaluation.id} className="border-t border-ink-100 pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-ink-800">{evaluation.evaluator.fullName}</span>
              <span className="text-xs font-semibold text-brand-700">{readableLabel(evaluation.recommendation)}</span>
            </div>
            {evaluation.totalScore != null && <p className="mt-0.5 text-xs text-ink-500">Total score: {evaluation.totalScore}</p>}
            {evaluation.comments && <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{evaluation.comments}</p>}
          </li>
        ))}
      </ul>

      {flags.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" /> {flags.length} IP advisory flag{flags.length > 1 ? 's' : ''}
          </p>
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
}

function ApprovalToggle({
  label,
  approved,
  onToggle,
  comment,
  onCommentChange,
}: {
  label: string;
  approved: boolean;
  onToggle: (checked: boolean) => void;
  comment: string;
  onCommentChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300 accent-brand-600"
        />
        {label}
      </label>
      <textarea
        rows={3}
        placeholder="Comments"
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        className="focus-ring mt-2 w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
      />
    </div>
  );
}

function ApprovalReadOnly({ label, approved, comment }: { label: string; approved: boolean; comment?: string | null }) {
  return (
    <div>
      {approved ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> {label} Approved
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-500">
          <XCircle className="h-3.5 w-3.5" /> {label} Not approved
        </span>
      )}
      {comment && <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">{comment}</p>}
    </div>
  );
}

function ApprovalSection({ innovation }: { innovation: any }) {
  const router = useRouter();
  const updateApproval = useUpdateInnovationApproval(innovation.id);
  const uploadFile = useUploadFile();

  const [recognitionApproved, setRecognitionApproved] = useState(Boolean(innovation.recognitionApproved));
  const [recognitionComment, setRecognitionComment] = useState(innovation.recognitionApprovalComment ?? '');
  const [mentorApproved, setMentorApproved] = useState(Boolean(innovation.mentorApproved));
  const [mentorComment, setMentorComment] = useState(innovation.mentorApprovalComment ?? '');
  const [fundApproved, setFundApproved] = useState(Boolean(innovation.fundApproved));
  const [fundComment, setFundComment] = useState(innovation.fundApprovalComment ?? '');

  const hasAnyRequest = innovation.recognitionNeeded || innovation.mentorshipNeeded || innovation.fundingNeeded;
  // Once the Admin's approval decision has been saved (SELECTED -> APPROVED, or further along —
  // PUBLISHED/ARCHIVED/REJECTED), this section is view-only: the decision has been made and must
  // not be re-entered, edited, or resubmitted. Only innovations still at SELECTED (Pending) are
  // editable here.
  const isReadOnly = innovation.reviewStatus !== 'SELECTED';

  function handleSave() {
    updateApproval.mutate(
      {
        ...(innovation.recognitionNeeded
          ? { recognitionApproved, recognitionApprovalComment: recognitionComment }
          : {}),
        ...(innovation.mentorshipNeeded ? { mentorApproved, mentorApprovalComment: mentorComment } : {}),
        ...(innovation.fundingNeeded ? { fundApproved, fundApprovalComment: fundComment } : {}),
        // This explicit save is the Admin's final decision — moves the innovation from Pending to
        // Reviewed server-side (SELECTED -> PUBLISHED). The approval-letter-upload save below
        // deliberately omits this flag, since uploading a letter isn't itself a final decision.
        finalize: true,
      },
      { onSuccess: () => router.push('/dashboard/admin/evaluations?saved=1') },
    );
  }

  function handleLetterUpload(file: File) {
    uploadFile.mutate(file, {
      onSuccess: (data) => updateApproval.mutate({ approvalLetterUrl: data.url }),
    });
  }

  return (
    <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink-900">Permission & Approval</h2>
        {isReadOnly && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-500">
            <Lock className="h-3.5 w-3.5" /> Decision saved — read-only
          </span>
        )}
      </div>

      {!hasAnyRequest ? (
        <p className="mt-3 text-sm text-ink-400">This innovator did not request Recognition, Mentor, or Fund support.</p>
      ) : isReadOnly ? (
        <div className="mt-4 space-y-4">
          {innovation.recognitionNeeded && (
            <ApprovalReadOnly label="Recognition" approved={Boolean(innovation.recognitionApproved)} comment={innovation.recognitionApprovalComment} />
          )}
          {innovation.mentorshipNeeded && (
            <ApprovalReadOnly label="Mentor" approved={Boolean(innovation.mentorApproved)} comment={innovation.mentorApprovalComment} />
          )}
          {innovation.fundingNeeded && (
            <ApprovalReadOnly label="Fund" approved={Boolean(innovation.fundApproved)} comment={innovation.fundApprovalComment} />
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {innovation.recognitionNeeded && (
            <ApprovalToggle
              label="Recognition Approved"
              approved={recognitionApproved}
              onToggle={setRecognitionApproved}
              comment={recognitionComment}
              onCommentChange={setRecognitionComment}
            />
          )}
          {innovation.mentorshipNeeded && (
            <ApprovalToggle
              label="Mentor Approved"
              approved={mentorApproved}
              onToggle={setMentorApproved}
              comment={mentorComment}
              onCommentChange={setMentorComment}
            />
          )}
          {innovation.fundingNeeded && (
            <ApprovalToggle
              label="Fund Approved"
              approved={fundApproved}
              onToggle={setFundApproved}
              comment={fundComment}
              onCommentChange={setFundComment}
            />
          )}
        </div>
      )}

      <div className="mt-6 border-t border-ink-100 pt-5">
        <label className="mb-1 block text-sm font-medium text-ink-700">Approval letter</label>
        <p className="text-xs text-ink-500">One shared letter covers whichever of the approvals above apply.</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {innovation.approvalLetterUrl ? (
            <a
              href={innovation.approvalLetterUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 hover:border-brand-300 hover:text-brand-700"
            >
              <FileText className="h-4 w-4" /> View / download current letter
            </a>
          ) : (
            isReadOnly && <p className="text-xs text-ink-400">No letter uploaded.</p>
          )}
          {!isReadOnly && (
            <label className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:border-clay-400">
              <Upload className="h-4 w-4" />
              {uploadFile.isPending ? 'Uploading…' : innovation.approvalLetterUrl ? 'Replace letter' : 'Upload letter'}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLetterUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
        {uploadFile.isError && <p className="mt-1 text-xs text-red-600">Upload failed — try a different file.</p>}
        {/* Only meaningful feedback for the letter-only save here — the main "Save approval
            decisions" save redirects away immediately on success, so this rarely has time to show
            for that path. */}
        {!isReadOnly && updateApproval.isSuccess && (
          <p className="mt-2 text-xs font-medium text-brand-700">Saved.</p>
        )}
      </div>

      {!isReadOnly && updateApproval.isError && (
        <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {(updateApproval.error as any)?.message ?? 'Failed to save approval decisions.'}
        </p>
      )}

      {!isReadOnly && hasAnyRequest && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateApproval.isPending}
            className="focus-ring rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {updateApproval.isPending ? 'Saving…' : 'Save approval decisions'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminInnovationEvaluationPage({ params }: { params: { innovationId: string } }) {
  const { innovationId } = params;
  const { data: innovation, isLoading } = useInnovation(innovationId) as { data: any; isLoading: boolean };

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!innovation) return <p className="text-ink-400">Innovation not found.</p>;

  const photo = innovation.attachments?.find((a: any) => a.kind === 'PHOTO');
  const documents = innovation.attachments?.filter((a: any) => a.kind !== 'PHOTO') ?? [];

  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/admin/evaluations" className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to evaluations
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
                <dt className="text-ink-500">Status</dt>
                <dd className="font-medium text-ink-800">{readableLabel(innovation.reviewStatus)}</dd>
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
                <dt className="text-ink-500">Recognition</dt>
                <dd><RequestBadge requested={Boolean(innovation.recognitionNeeded)} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Mentorship</dt>
                <dd><RequestBadge requested={Boolean(innovation.mentorshipNeeded)} /></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Funding</dt>
                <dd><RequestBadge requested={Boolean(innovation.fundingNeeded)} /></dd>
              </div>
            </dl>
          </div>

          <EvaluationsSummaryCard innovationId={innovationId} />

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

      <ApprovalSection innovation={innovation} />
    </div>
  );
}
