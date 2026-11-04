'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { AlertCircle } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useCategories, useRegions } from '@/hooks/use-content';
import { useCreateInnovation } from '@/hooks/use-innovations';
import { useCurrentUser } from '@/hooks/use-auth';
import { useMinistryCycles } from '@/hooks/use-ministries';
import { ApiError } from '@/lib/api-client';
import { Role } from '@nir/shared';
import { EMPTY_INNOVATION_FORM, InnovationFormFields } from '@/components/submit/innovation-form-fields';

export default function SubmitInnovationPage() {
  const user = useRequireAuth();
  const router = useRouter();
  const { data: categories } = useCategories();
  const { data: regions } = useRegions();
  const { data: profile } = useCurrentUser() as { data: any };
  const isMinistryFocalPoint = Boolean(user?.roles.includes(Role.MINISTRY_FOCAL_POINT));
  const isAdmin = Boolean(user?.roles.some((r) => r === Role.PLATFORM_ADMIN || r === Role.SYSTEM_ADMIN));
  const { data: cycles } = useMinistryCycles() as { data: any[] };
  const createInnovation = useCreateInnovation();

  const [form, setForm] = useState(EMPTY_INNOVATION_FORM);
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (!user) return <div className="container-page py-24 text-center text-ink-400">Checking your session…</div>;

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
    const created = await createInnovation.mutateAsync(payload);
    router.push(`/dashboard/innovations/${(created as any).id}`);
  };

  return (
    <div className="container-page max-w-3xl py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Innovation Registration & Submission</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">Submit an innovation</h1>
      <p className="mt-3 text-ink-600">
        Tell us about your idea, prototype, or deployed solution. You can save this as a draft and add photos, documents,
        and team members before sending it for review.
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

        {createInnovation.isError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {createInnovation.error instanceof ApiError ? createInnovation.error.message : 'Something went wrong'}
          </p>
        )}

        <label className="flex items-start gap-2.5 text-sm text-ink-600">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded-sm border-2 border-ink-400 text-brand-600"
          />
          <span>
            I agree to the <span className="font-medium text-brand-700 underline underline-offset-2">Terms &amp; Conditions</span> *
          </span>
        </label>

        <button
          type="submit"
          disabled={createInnovation.isPending || !termsAccepted}
          className="focus-ring rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {createInnovation.isPending ? 'Saving…' : 'Save draft & continue'}
        </button>
        <p className="text-xs text-ink-400">
          {isAdmin
            ? "This saves as a draft. You'll be able to attach photos, documents, and the innovation team next, then publish it directly to the repository."
            : "This saves as a draft. You'll be able to attach photos and documents next, and submit for review when ready."}
        </p>
      </form>
    </div>
  );
}
