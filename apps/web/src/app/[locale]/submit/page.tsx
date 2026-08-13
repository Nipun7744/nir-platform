'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { AlertCircle } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useCategories, useRegions } from '@/hooks/use-content';
import { useCreateInnovation } from '@/hooks/use-innovations';
import { useCurrentUser } from '@/hooks/use-auth';
import { useMinistryCycles } from '@/hooks/use-ministries';
import { ApiError } from '@/lib/api-client';
import { Role } from '@nir/shared';

const INNOVATION_TYPES = ['PRODUCT', 'PROCESS', 'SERVICE', 'DIGITAL_SOLUTION', 'TECHNOLOGY', 'POLICY_INNOVATION', 'RESEARCH_OUTPUT'];
const IP_STATUSES = ['NONE', 'PATENTED', 'PATENT_PENDING', 'UNDER_PROCESSING'];
const FUNDING_SOURCES = ['A2I_INNOVATION_FUND', 'GOVERNMENT', 'DEVELOPMENT_PARTNER', 'PRIVATE_INVESTMENT', 'SELF_FUNDED'];

function readableLabel(value: string) {
  return value.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export default function SubmitInnovationPage() {
  const user = useRequireAuth();
  const locale = useLocale();
  const router = useRouter();
  const { data: categories } = useCategories();
  const { data: regions } = useRegions();
  const { data: profile } = useCurrentUser() as { data: any };
  const isMinistryFocalPoint = Boolean(user?.roles.includes(Role.MINISTRY_FOCAL_POINT));
  const { data: cycles } = useMinistryCycles() as { data: any[] };
  const createInnovation = useCreateInnovation();

  const [form, setForm] = useState({
    titleEn: '',
    summaryEn: '',
    problemStatement: '',
    proposedSolution: '',
    objectives: '',
    keyFeatures: '',
    targetBeneficiaries: '',
    impact: '',
    innovationType: 'PRODUCT',
    categoryId: '',
    regionId: '',
    ipStatus: 'NONE',
    fundingSource: '',
    technologyReadinessLevel: '',
    ministryCycleId: '',
    mentorshipNeeded: false,
    fundingNeeded: false,
    recognitionNeeded: false,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setChecked = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }));

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
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Innovation title *</label>
          <input required value={form.titleEn} onChange={set('titleEn')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Summary *</label>
          <textarea required rows={3} value={form.summaryEn} onChange={set('summaryEn')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Category *</label>
            <select required value={form.categoryId} onChange={set('categoryId')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
              <option value="">Select a category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{locale === 'bn' ? c.nameBn : c.nameEn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Innovation type *</label>
            <select required value={form.innovationType} onChange={set('innovationType')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
              {INNOVATION_TYPES.map((t) => <option key={t} value={t}>{readableLabel(t)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Problem statement *</label>
          <textarea required rows={3} value={form.problemStatement} onChange={set('problemStatement')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Proposed solution *</label>
          <textarea required rows={3} value={form.proposedSolution} onChange={set('proposedSolution')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Objectives</label>
          <textarea rows={2} value={form.objectives} onChange={set('objectives')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Key features</label>
          <textarea rows={2} value={form.keyFeatures} onChange={set('keyFeatures')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Target beneficiaries</label>
            <textarea rows={3} value={form.targetBeneficiaries} onChange={set('targetBeneficiaries')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Impact</label>
            <textarea rows={3} value={form.impact} onChange={set('impact')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Region</label>
            <select value={form.regionId} onChange={set('regionId')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
              <option value="">—</option>
              {regions?.map((r) => <option key={r.id} value={r.id}>{locale === 'bn' ? r.nameBn : r.nameEn}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">IP status</label>
            <select value={form.ipStatus} onChange={set('ipStatus')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
              {IP_STATUSES.map((s) => <option key={s} value={s}>{readableLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">TRL (1-9)</label>
            <input type="number" min={1} max={9} value={form.technologyReadinessLevel} onChange={set('technologyReadinessLevel')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.recognitionNeeded}
              onChange={setChecked('recognitionNeeded')}
              className="focus-ring h-4 w-4 rounded border-ink-300 text-brand-600"
            />
            Recognition needed
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.mentorshipNeeded}
              onChange={setChecked('mentorshipNeeded')}
              className="focus-ring h-4 w-4 rounded border-ink-300 text-brand-600"
            />
            Mentorship needed
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.fundingNeeded}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((f) => ({ ...f, fundingNeeded: checked, fundingSource: checked ? f.fundingSource : '' }));
              }}
              className="focus-ring h-4 w-4 rounded border-ink-300 text-brand-600"
            />
            Funding needed
          </label>
        </div>

        {form.fundingNeeded && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Funding source</label>
            <select value={form.fundingSource} onChange={set('fundingSource')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
              <option value="">—</option>
              {FUNDING_SOURCES.map((s) => <option key={s} value={s}>{readableLabel(s)}</option>)}
            </select>
          </div>
        )}

        {isMinistryFocalPoint && (
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
            <label className="mb-1 block text-sm font-medium text-ink-700">
              Ministry annual submission cycle
            </label>
            <select value={form.ministryCycleId} onChange={set('ministryCycleId')} className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
              <option value="">Not part of a ministry cycle</option>
              {cycles?.map((c) => <option key={c.id} value={c.id}>{c.year} cycle</option>)}
            </select>
            <p className="mt-1 text-xs text-ink-500">
              Tags this innovation to your ministry ({profile?.ministryProfile ? 'linked' : 'complete your ministry registration first'}) and the selected annual cycle.
            </p>
          </div>
        )}

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
          This saves as a draft. You'll be able to attach photos and documents next, and submit for review when ready.
        </p>
      </form>
    </div>
  );
}
