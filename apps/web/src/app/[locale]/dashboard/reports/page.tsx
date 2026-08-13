'use client';

import { Download } from 'lucide-react';
import { useKpis, useFundUtilization, useServiceAnalytics } from '@/hooks/use-reports';
import { API_BASE_URL } from '@/lib/config';
import { useAuthStore } from '@/store/auth-store';

export default function ReportsPage() {
  const { data: kpis } = useKpis() as { data: any };
  const { data: fund } = useFundUtilization() as { data: any };
  const { data: analytics } = useServiceAnalytics() as { data: any };

  const downloadCsv = async () => {
    const accessToken = useAuthStore.getState().accessToken;
    const res = await fetch(`${API_BASE_URL}/reporting/export/innovations.csv`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nir-innovations-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Reports & KPIs</h1>
        <button onClick={downloadCsv} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <p className="text-2xl font-extrabold text-ink-900">{kpis?.avgReviewTimeDays ?? '—'}</p>
          <p className="mt-1 text-xs text-ink-500">Avg. review time (days)</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <p className="text-2xl font-extrabold text-ink-900">{kpis?.adoptionRate ?? '—'}%</p>
          <p className="mt-1 text-xs text-ink-500">Adoption rate (scaled/commercialized)</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <p className="text-2xl font-extrabold text-ink-900">{kpis?.publishedCount ?? '—'}</p>
          <p className="mt-1 text-xs text-ink-500">Published innovations</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <p className="text-2xl font-extrabold text-ink-900">BDT {fund?.totalDisbursed?.toLocaleString() ?? 0}</p>
          <p className="mt-1 text-xs text-ink-500">Total funds disbursed</p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Fund utilization by source</h2>
          <div className="mt-3 space-y-2">
            {fund && Object.entries(fund.bySource).map(([source, amount]) => (
              <div key={source} className="flex justify-between rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm">
                <span className="text-ink-600">{source.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-ink-800">BDT {Number(amount).toLocaleString()}</span>
              </div>
            ))}
            {fund && Object.keys(fund.bySource).length === 0 && <p className="text-sm text-ink-400">No disbursements recorded yet.</p>}
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Submissions by status</h2>
          <div className="mt-3 space-y-2">
            {analytics?.byStatus.map((s: any) => (
              <div key={s.status} className="flex justify-between rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm">
                <span className="text-ink-600">{s.status.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-ink-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
