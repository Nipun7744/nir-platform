'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { MapPin, Users, FileText, Award as AwardIcon, ArrowLeft, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useInnovation, useRelatedInnovations } from '@/hooks/use-repository-search';
import { useReviewComments } from '@/hooks/use-innovations';
import { useEvaluationsForInnovation } from '@/hooks/use-evaluations';
import { ReviewCommentTimeline } from '@/components/reviews/review-comment-timeline';
import { StagePill } from '@/components/ui/stage-pill';
import { CategoryIcon } from '@/components/ui/category-icon';
import { InnovationCard } from '@/components/ui/innovation-card';
import { useAuthStore } from '@/store/auth-store';
import { Role } from '@nir/shared';

const SUBMITTER_PROFILE_ROLES = [Role.PRELIMINARY_REVIEWER, Role.AUTHENTICITY_REVIEWER, Role.EXPERT_EVALUATOR, Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN];

function readableLabel(value?: string) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// Visible to Platform Admins only, and only once the innovation actually has feedback —
// mirrors the API's existing role gates (review-comments, evaluations/by-innovation) rather
// than loosening them.
function AdminFeedbackPanel({ innovationId }: { innovationId: string }) {
  const { data: comments, isLoading: loadingComments } = useReviewComments(innovationId) as { data: any[]; isLoading: boolean };
  const { data: evaluations, isLoading: loadingEvaluations } = useEvaluationsForInnovation(innovationId) as {
    data: any[];
    isLoading: boolean;
  };

  if (loadingComments || loadingEvaluations) return null;

  const hasFeedback = Boolean(comments?.length) || Boolean(evaluations?.length);
  if (!hasFeedback) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand-700">
        <ShieldCheck className="h-4 w-4" /> Review &amp; evaluation feedback
        <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Admin only</span>
      </h3>

      <div className="mt-4 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Primary reviewer</p>
          <div className="mt-2">
            <ReviewCommentTimeline innovationId={innovationId} stages={['PRELIMINARY_REVIEW']} emptyText="No preliminary review notes yet." />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Authenticity reviewer</p>
          <div className="mt-2">
            <ReviewCommentTimeline innovationId={innovationId} stages={['AUTHENTICITY_REVIEW']} emptyText="No authenticity review notes yet." />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Expert evaluator</p>
          <div className="mt-2 space-y-2">
            {(!evaluations || evaluations.length === 0) && (
              <p className="text-xs text-ink-400">No evaluations submitted yet.</p>
            )}
            {evaluations?.map((ev: any) => (
              <div key={ev.id} className="rounded-lg bg-white px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">{ev.evaluator?.fullName ?? 'Evaluator'}</span>
                  <span>{ev.submittedAt ? new Date(ev.submittedAt).toLocaleDateString() : 'Draft'}</span>
                </div>
                {ev.scores && Object.keys(ev.scores).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                    {Object.entries(ev.scores).map(([criterion, value]) => (
                      <span key={criterion}>
                        {criterion}: <span className="font-semibold text-ink-800">{value as number}/10</span>
                      </span>
                    ))}
                    {ev.totalScore != null && <span className="font-semibold text-brand-700">Total: {ev.totalScore}</span>}
                  </div>
                )}
                {ev.recommendation && (
                  <p className="mt-1.5 text-xs font-medium text-ink-700">Recommendation: {readableLabel(ev.recommendation)}</p>
                )}
                {ev.comments && <p className="mt-1.5 text-ink-600">{ev.comments}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InnovationDetail({ slug }: { slug: string }) {
  const locale = useLocale();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data: innovation, isLoading } = useInnovation(slug) as { data: any; isLoading: boolean };
  const { data: related } = useRelatedInnovations(innovation?.id ?? '');

  if (isLoading) return <div className="container-page py-24 text-center text-ink-400">Loading…</div>;
  if (!innovation) return <div className="container-page py-24 text-center text-ink-400">Innovation not found.</div>;

  const photo = innovation.attachments?.find((a: any) => a.kind === 'PHOTO');
  const leadInnovator = innovation.team?.find((m: any) => m.roleInTeam === 'Lead Innovator') ?? innovation.team?.[0];
  const submitterProfile = leadInnovator?.innovator?.user;
  const submitterName = submitterProfile?.fullName ?? leadInnovator?.displayName;
  const submitterSubtitle =
    [submitterProfile?.designation, submitterProfile?.institution].filter(Boolean).join(', ') ||
    innovation.organization?.name;
  const canViewSubmitterProfile = Boolean(
    currentUser?.roles.some((r) => SUBMITTER_PROFILE_ROLES.includes(r)),
  );
  const isPlatformAdmin = Boolean(currentUser?.roles.includes(Role.PLATFORM_ADMIN));

  return (
    <div>
      <div className="border-b border-ink-100 bg-gradient-to-b from-brand-50/50 to-white">
        <div className="container-page py-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <StagePill stage={innovation.developmentStage} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 shadow-sm">
              <CategoryIcon name={innovation.category.icon} className="h-3.5 w-3.5" />
              {locale === 'bn' ? innovation.category.nameBn : innovation.category.nameEn}
            </span>
            <span className="font-mono text-xs text-ink-400">{innovation.innovationCode}</span>
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl">
            {innovation.titleEn}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-600">{innovation.summaryEn}</p>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
            {innovation.organization && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-600" /> {innovation.organization.name}
              </span>
            )}
            {innovation.region && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-600" /> {locale === 'bn' ? innovation.region.nameBn : innovation.region.nameEn}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {photo && (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-ink-100">
              <Image src={photo.url} alt={photo.caption ?? innovation.titleEn} fill className="object-cover" sizes="800px" />
            </div>
          )}

          <section>
            <h2 className="font-display text-xl font-bold text-ink-900">Problem statement</h2>
            <p className="mt-3 leading-relaxed text-ink-700">{innovation.problemStatement}</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink-900">Proposed solution</h2>
            <p className="mt-3 leading-relaxed text-ink-700">{innovation.proposedSolution}</p>
          </section>

          {innovation.objectives && (
            <section>
              <h2 className="font-display text-xl font-bold text-ink-900">Objectives</h2>
              <p className="mt-3 leading-relaxed text-ink-700">{innovation.objectives}</p>
            </section>
          )}

          {innovation.keyFeatures && (
            <section>
              <h2 className="font-display text-xl font-bold text-ink-900">Key features</h2>
              <p className="mt-3 leading-relaxed text-ink-700">{innovation.keyFeatures}</p>
            </section>
          )}

          {innovation.targetBeneficiaries && (
            <section>
              <h2 className="font-display text-xl font-bold text-ink-900">Target beneficiaries</h2>
              <p className="mt-3 leading-relaxed text-ink-700">{innovation.targetBeneficiaries}</p>
            </section>
          )}

          {innovation.impact && (
            <section>
              <h2 className="font-display text-xl font-bold text-ink-900">Impact</h2>
              <p className="mt-3 leading-relaxed text-ink-700">{innovation.impact}</p>
            </section>
          )}

          {innovation.attachments?.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold text-ink-900">Supporting documents</h2>
              <div className="mt-3 space-y-2">
                {innovation.attachments
                  .filter((a: any) => a.kind !== 'PHOTO')
                  .map((a: any) => (
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
          {leadInnovator && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Submitted by</h3>
              <div className="mt-3 flex items-center gap-3">
                {submitterProfile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={submitterProfile.avatarUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full border border-ink-100 object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-300">
                    <UserIcon className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0">
                  {canViewSubmitterProfile ? (
                    <Link
                      href={`/dashboard/submitters/${innovation.submittedById}`}
                      className="focus-ring truncate text-sm font-bold text-ink-900 hover:text-brand-700 hover:underline"
                    >
                      {submitterName}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-bold text-ink-900">{submitterName}</p>
                  )}
                  {submitterSubtitle && <p className="truncate text-xs text-ink-500">{submitterSubtitle}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Innovation details</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Type</dt>
                <dd className="font-medium text-ink-800">{readableLabel(innovation.innovationType)}</dd>
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
              {innovation.commercializationStatus && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Commercialization</dt>
                  <dd className="text-right font-medium text-ink-800">{innovation.commercializationStatus}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Views</dt>
                <dd className="font-medium text-ink-800">{innovation.viewCount}</dd>
              </div>
            </dl>
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

          {innovation.awards?.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-ink-500">
                <AwardIcon className="h-4 w-4" /> Awards & recognition
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
                {innovation.awards.map((award: any) => (
                  <li key={award.id}>{award.title} {award.year && `(${award.year})`}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {isPlatformAdmin && (
        <div className="border-t border-ink-100 bg-ink-50/40">
          <div className="container-page py-10">
            <AdminFeedbackPanel innovationId={innovation.id} />
          </div>
        </div>
      )}

      {related && related.length > 0 && (
        <div className="border-t border-ink-100 bg-brand-50/30">
          <div className="container-page py-12">
            <h2 className="font-display text-2xl font-extrabold text-ink-900">Related innovations</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, i) => (
                <InnovationCard key={item.id} innovation={item} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
