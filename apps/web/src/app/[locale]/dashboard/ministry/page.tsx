'use client';

import { Link } from '@/i18n/navigation';
import { useMinistryCycles, useMySubmissions, useCreateMinistrySubmission, useSubmitMinistrySubmission } from '@/hooks/use-ministries';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-ink-50 text-ink-500',
  SUBMITTED: 'bg-sun-100 text-sun-600',
  VALIDATED: 'bg-brand-100 text-brand-700',
  REJECTED: 'bg-red-50 text-red-600',
};

export default function MinistryDashboardPage() {
  const { data: cycles } = useMinistryCycles() as { data: any[] };
  const { data: submissions } = useMySubmissions() as { data: any[] };
  const createSubmission = useCreateMinistrySubmission();
  const submitSubmission = useSubmitMinistrySubmission();

  const submittedCycleIds = new Set((submissions ?? []).map((s) => s.cycleId));

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Ministry annual submissions</h1>
      <p className="mt-1 text-ink-600">Open a submission for your ministry's current cycle, then submit your innovations for validation.</p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink-900">Available cycles</h2>
        <div className="mt-3 space-y-3">
          {cycles?.map((cycle) => (
            <div key={cycle.id} className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div>
                <p className="font-medium text-ink-800">{cycle.year} submission cycle</p>
                <p className="text-xs text-ink-500">
                  {new Date(cycle.opensAt).toLocaleDateString()} – {new Date(cycle.closesAt).toLocaleDateString()}
                </p>
              </div>
              {!submittedCycleIds.has(cycle.id) && (
                <button
                  onClick={() => createSubmission.mutate({ cycleId: cycle.id })}
                  disabled={createSubmission.isPending}
                  className="focus-ring rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Open submission
                </button>
              )}
            </div>
          ))}
          {!cycles?.length && <p className="text-ink-400">No submission cycles have been configured yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold text-ink-900">My ministry's submissions</h2>
        <div className="mt-3 space-y-3">
          {submissions?.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div>
                <p className="font-medium text-ink-800">{s.ministry.nameEn} — {s.cycle.year}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                {s.status === 'DRAFT' && (
                  <button onClick={() => submitSubmission.mutate(s.id)} className="focus-ring rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300">
                    Submit for validation
                  </button>
                )}
              </div>
            </div>
          ))}
          {!submissions?.length && <p className="text-ink-400">No submissions started yet.</p>}
        </div>
      </section>

      <p className="mt-8 text-sm text-ink-500">
        To add innovations to an open cycle, use <Link href="/submit" className="font-semibold text-brand-700 hover:underline">the submission form</Link> — it shows a ministry cycle selector once you've registered as a focal point.
      </p>
    </div>
  );
}
