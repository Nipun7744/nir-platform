'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useRepositorySearch } from '@/hooks/use-repository-search';
import { useMyEois, useCreateEoi, useMyReferrals } from '@/hooks/use-funding';

const EOI_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-sun-100 text-sun-600',
  ACKNOWLEDGED: 'bg-clay-50 text-clay-600',
  IN_DISCUSSION: 'bg-brand-50 text-brand-700',
  AGREEMENT_SIGNED: 'bg-brand-100 text-brand-800',
  DECLINED: 'bg-red-50 text-red-600',
};

export default function InvestorDashboardPage() {
  const { data: eois, isLoading: loadingEois } = useMyEois() as { data: any[]; isLoading: boolean };
  const { data: referrals, isLoading: loadingReferrals } = useMyReferrals() as { data: any[]; isLoading: boolean };
  const { data: results } = useRepositorySearch({ sort: 'newest', pageSize: 6 });
  const createEoi = useCreateEoi();
  const [messages, setMessages] = useState<Record<string, string>>({});

  const eoiInnovationIds = new Set((eois ?? []).map((e) => e.innovationId));

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Investor dashboard</h1>
      <p className="mt-1 text-ink-600">Discover published innovations and track your expressions of interest.</p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink-900">Referred to you by evaluators</h2>
        <div className="mt-3 space-y-3">
          {loadingReferrals && <p className="text-ink-400">Loading…</p>}
          {referrals?.map((referral) => (
            <div key={referral.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <p className="font-mono text-[11px] uppercase text-ink-400">{referral.innovation.category?.nameEn}</p>
              {referral.innovation.reviewStatus === 'PUBLISHED' ? (
                <Link href={`/repository/${referral.innovation.slug}`} className="font-medium text-ink-800 hover:text-brand-700">
                  {referral.innovation.titleEn}
                </Link>
              ) : (
                <p className="font-medium text-ink-800">{referral.innovation.titleEn}</p>
              )}
              {referral.message && <p className="mt-1 text-sm text-ink-600">{referral.message}</p>}
              {referral.innovation.reviewStatus !== 'PUBLISHED' && (
                <p className="mt-1 text-xs text-ink-400">Still under review — you can express interest once it's published.</p>
              )}
            </div>
          ))}
          {!loadingReferrals && referrals?.length === 0 && (
            <p className="text-ink-400">No referrals yet.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink-900">My expressions of interest</h2>
        <div className="mt-3 space-y-3">
          {loadingEois && <p className="text-ink-400">Loading…</p>}
          {eois?.map((eoi) => (
            <div key={eoi.id} className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <Link href={`/repository/${eoi.innovation.slug}`} className="font-medium text-ink-800 hover:text-brand-700">
                {eoi.innovation.titleEn}
              </Link>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${EOI_STATUS_STYLES[eoi.status]}`}>
                {eoi.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
          {!loadingEois && eois?.length === 0 && <p className="text-ink-400">You haven't expressed interest in any innovations yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Recently published innovations</h2>
          <Link href="/repository" className="text-sm font-semibold text-brand-700 hover:underline">Browse all →</Link>
        </div>
        <div className="mt-3 space-y-3">
          {results?.items.map((innovation) => {
            const alreadyExpressed = eoiInnovationIds.has(innovation.id);
            return (
              <div key={innovation.id} className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase text-ink-400">{innovation.category.nameEn}</p>
                  <Link href={`/repository/${innovation.slug}`} className="font-medium text-ink-800 hover:text-brand-700">
                    {innovation.titleEn}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="Optional message"
                    value={messages[innovation.id] ?? ''}
                    onChange={(e) => setMessages((m) => ({ ...m, [innovation.id]: e.target.value }))}
                    className="focus-ring w-48 rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs"
                    disabled={alreadyExpressed}
                  />
                  <button
                    disabled={alreadyExpressed || createEoi.isPending}
                    onClick={() => createEoi.mutate({ innovationId: innovation.id, message: messages[innovation.id] })}
                    className="focus-ring shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {alreadyExpressed ? 'Interest sent' : 'Express interest'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
