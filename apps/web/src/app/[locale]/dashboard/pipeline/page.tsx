'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { usePipelineBoard, useUpdatePipelineStage, useCreateDisbursement } from '@/hooks/use-pipeline';

const STAGES = ['INTAKE', 'UNDER_ASSESSMENT', 'ADVISORY_SUPPORT', 'FUNDED', 'SCALING', 'CLOSED'];
const FUNDING_SOURCES = ['A2I_INNOVATION_FUND', 'GOVERNMENT', 'DEVELOPMENT_PARTNER', 'PRIVATE_INVESTMENT', 'SELF_FUNDED'];

function DisbursementForm({ innovationId }: { innovationId: string }) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(FUNDING_SOURCES[0]);
  const createDisbursement = useCreateDisbursement();

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <input
        type="number"
        placeholder="Amount (BDT)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="focus-ring w-28 rounded-lg border border-ink-100 px-2 py-1 text-xs"
      />
      <select value={source} onChange={(e) => setSource(e.target.value)} className="focus-ring rounded-lg border border-ink-100 px-2 py-1 text-xs">
        {FUNDING_SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
      </select>
      <button
        disabled={!amount || createDisbursement.isPending}
        onClick={() =>
          createDisbursement.mutate({
            innovationId,
            amount: Number(amount),
            source,
            disbursedAt: new Date().toISOString(),
          })
        }
        className="focus-ring rounded-lg bg-ink-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
      >
        {createDisbursement.isSuccess ? 'Recorded' : 'Record fund'}
      </button>
    </div>
  );
}

export default function PipelinePage() {
  const { data, isLoading } = usePipelineBoard() as { data: any[]; isLoading: boolean };
  const updateStage = useUpdatePipelineStage();

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Innovation pipeline</h1>
      <p className="mt-1 text-ink-600">Track selected and published innovations from intake through scaling.</p>

      {isLoading && <p className="mt-6 text-ink-400">Loading…</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => (
          <div key={stage} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">{stage.replace(/_/g, ' ')}</h2>
            {data?.filter((i) => i.pipelineStage === stage).map((innovation) => (
              <div key={innovation.id} className="rounded-xl border border-ink-100 bg-white p-3 shadow-card">
                <p className="font-mono text-[10px] text-ink-400">{innovation.innovationCode}</p>
                <Link href={`/repository/${innovation.slug}`} className="text-sm font-semibold text-ink-800 hover:text-brand-700">
                  {innovation.titleEn}
                </Link>
                <select
                  value={stage}
                  onChange={(e) => updateStage.mutate({ innovationId: innovation.id, pipelineStage: e.target.value })}
                  className="focus-ring mt-2 w-full rounded-lg border border-ink-100 px-2 py-1 text-xs"
                >
                  {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <DisbursementForm innovationId={innovation.id} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
