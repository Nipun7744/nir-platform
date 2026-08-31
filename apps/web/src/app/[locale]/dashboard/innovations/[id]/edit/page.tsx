'use client';

import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useInnovation } from '@/hooks/use-repository-search';
import { useUpdateInnovation } from '@/hooks/use-innovations';
import { useCategories, useRegions } from '@/hooks/use-content';
import { useCurrentUser } from '@/hooks/use-auth';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useMinistryCycles } from '@/hooks/use-ministries';
import { ApiError } from '@/lib/api-client';
import { Role } from '@nir/shared';
import { EMPTY_INNOVATION_FORM, InnovationFormFields, type InnovationFormState } from '@/components/submit/innovation-form-fields';

function toFormState(innovation: any): InnovationFormState {
  return {
    titleEn: innovation.titleEn ?? '',
    summaryEn: innovation.summaryEn ?? '',
    problemStatement: innovation.problemStatement ?? '',
    proposedSolution: innovation.proposedSolution ?? '',
    objectives: innovation.objectives ?? '',
    keyFeatures: innovation.keyFeatures ?? '',
    targetBeneficiaries: innovation.targetBeneficiaries ?? '',
    impact: innovation.impact ?? '',
    innovationType: innovation.innovationType ?? 'PRODUCT',
    categoryId: innovation.categoryId ?? '',
    regionId: innovation.regionId ?? '',
    ipStatus: innovation.ipStatus ?? 'NONE',
    fundingSource: innovation.fundingSource ?? '',
    technologyReadinessLevel: innovation.technologyReadinessLevel != null ? String(innovation.technologyReadinessLevel) : '',
    ministryCycleId: innovation.ministryCycleId ?? '',
    mentorshipNeeded: Boolean(innovation.mentorshipNeeded),
    fundingNeeded: Boolean(innovation.fundingNeeded),
    recognitionNeeded: Boolean(innovation.recognitionNeeded),
  };
}

export default function EditInnovationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const authUser = useRequireAuth();
  const { data: innovation, isLoading } = useInnovation(id) as { data: any; isLoading: boolean };
  const { data: categories } = useCategories();
  const { data: regions } = useRegions();
  const { data: profile } = useCurrentUser() as { data: any };
  const isMinistryFocalPoint = Boolean(authUser?.roles.includes(Role.MINISTRY_FOCAL_POINT));
  const { data: cycles } = useMinistryCycles() as { data: any[] };
  const updateInnovation = useUpdateInnovation(id);

  const [form, setForm] = useState<InnovationFormState>(EMPTY_INNOVATION_FORM);
  const [loaded, setLoaded] = useState(false);

  // Pre-populate once the draft loads — a plain effect rather than lazy useState init because the
  // query is still loading on first render (id-keyed, not available synchronously).
  useEffect(() => {
    if (innovation && !loaded) {
      setForm(toFormState(innovation));
      setLoaded(true);
    }
  }, [innovation, loaded]);

  if (isLoading) return <p className="text-ink-400">Loading…</p>;
  if (!innovation) return <p className="text-ink-400">Submission not found.</p>;

  const canEdit = innovation.reviewStatus === 'DRAFT' || innovation.reviewStatus === 'REJECTED';

  if (!canEdit) {
    return (
      <div>
        <Link href={`/dashboard/innovations/${id}`} className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="h-4 w-4" /> Back to submission
        </Link>
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-ink-500">
          This submission is no longer editable — it's already{' '}
          {innovation.reviewStatus.replace(/_/g, ' ').toLowerCase()} and moved into the review pipeline.
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ministryCycleId, ...rest } = form;
    const payload: Record<string, unknown> = {
      ...rest,
      technologyReadinessLevel: form.technologyReadinessLevel ? Number(form.technologyReadinessLevel) : undefined,
      fundingSource: form.fundingSource || undefined,
      regionId: form.regionId || undefined,
      ...(isMinistryFocalPoint && ministryCycleId
        ? { ministryId: profile?.ministryProfile?.ministryId, ministryCycleId }
        : {}),
    };
    await updateInnovation.mutateAsync(payload);
  };

  return (
    <div>
      <Link href={`/dashboard/innovations/${id}`} className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to submission
      </Link>

      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Innovation Registration & Submission</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">Edit your draft</h1>
      <p className="mt-3 text-ink-600">
        Update any field below and save — your submission stays in draft until you're ready to submit it for review.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <InnovationFormFields
          form={form}
          setForm={setForm}
          categories={categories}
          regions={regions}
          isMinistryFocalPoint={isMinistryFocalPoint}
          cycles={cycles}
          profile={profile}
        />

        {updateInnovation.isError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {updateInnovation.error instanceof ApiError ? updateInnovation.error.message : 'Something went wrong'}
          </p>
        )}

        {updateInnovation.isSuccess && !updateInnovation.isPending && (
          <p className="flex items-center gap-1.5 text-sm text-brand-700">
            <CheckCircle2 className="h-4 w-4" /> Changes saved.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={updateInnovation.isPending}
            className="focus-ring rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {updateInnovation.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/innovations/${id}`)}
            className="focus-ring rounded-full border border-ink-200 px-6 py-2.5 text-sm font-semibold text-ink-700 hover:border-ink-300"
          >
            Done editing
          </button>
        </div>
        <p className="text-xs text-ink-400">
          This still saves as a draft. Photos, documents, and team members are managed from the submission page.
        </p>
      </form>
    </div>
  );
}
