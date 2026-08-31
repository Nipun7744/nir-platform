'use client';

import { useLocale } from 'next-intl';

const INNOVATION_TYPES = ['PRODUCT', 'PROCESS', 'SERVICE', 'DIGITAL_SOLUTION', 'TECHNOLOGY', 'POLICY_INNOVATION', 'RESEARCH_OUTPUT'];
const IP_STATUSES = ['NONE', 'PATENTED', 'PATENT_PENDING', 'UNDER_PROCESSING'];
const FUNDING_SOURCES = ['A2I_INNOVATION_FUND', 'GOVERNMENT', 'DEVELOPMENT_PARTNER', 'PRIVATE_INVESTMENT', 'SELF_FUNDED'];

function readableLabel(value: string) {
  return value.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export type InnovationFormState = {
  titleEn: string;
  summaryEn: string;
  problemStatement: string;
  proposedSolution: string;
  objectives: string;
  keyFeatures: string;
  targetBeneficiaries: string;
  impact: string;
  innovationType: string;
  categoryId: string;
  regionId: string;
  ipStatus: string;
  fundingSource: string;
  technologyReadinessLevel: string;
  ministryCycleId: string;
  mentorshipNeeded: boolean;
  fundingNeeded: boolean;
  recognitionNeeded: boolean;
};

export const EMPTY_INNOVATION_FORM: InnovationFormState = {
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
};

/**
 * The full innovation submission field set — shared between `/submit` (create) and
 * `/dashboard/innovations/[id]/edit` (R-002) so the two never drift. Every field here is a field
 * that was already editable at creation time; nothing new was added for edit mode.
 */
export function InnovationFormFields({
  form,
  setForm,
  categories,
  regions,
  isMinistryFocalPoint,
  cycles,
  profile,
}: {
  form: InnovationFormState;
  setForm: (updater: (f: InnovationFormState) => InnovationFormState) => void;
  categories: { id: string; nameEn: string; nameBn: string }[] | undefined;
  regions: { id: string; nameEn: string; nameBn: string }[] | undefined;
  isMinistryFocalPoint: boolean;
  cycles: { id: string; year: number }[] | undefined;
  profile: any;
}) {
  const locale = useLocale();

  const set = (key: keyof InnovationFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setChecked = (key: keyof InnovationFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }));

  return (
    <>
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
    </>
  );
}
