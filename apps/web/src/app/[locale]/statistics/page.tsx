'use client';

import { useLocale } from 'next-intl';
import { usePublicStats, usePublicBreakdown } from '@/hooks/use-content';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { CategoryIcon } from '@/components/ui/category-icon';
import { useCategories } from '@/hooks/use-content';

export default function StatisticsPage() {
  const locale = useLocale();
  const { data: stats } = usePublicStats();
  const { data: breakdown } = usePublicBreakdown();
  const { data: categories } = useCategories();

  const maxCategoryCount = Math.max(1, ...(breakdown?.byCategory.map((c) => c.count) ?? [1]));
  const maxRegionCount = Math.max(1, ...(breakdown?.byRegion.map((r) => r.count) ?? [1]));

  const iconFor = (categoryId: string) => categories?.find((c) => c.id === categoryId)?.icon ?? 'sparkles';

  return (
    <div className="container-page py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">National Statistics</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">Bangladesh's innovation ecosystem, by the numbers</h1>
      <p className="mt-3 max-w-2xl text-ink-600">
        Live figures computed directly from the repository — not a static snapshot. They grow as new innovations are published.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Innovations', value: stats?.totalInnovations ?? 0 },
          { label: 'Innovators', value: stats?.totalInnovators ?? 0 },
          { label: 'Organizations', value: stats?.totalOrganizations ?? 0 },
          { label: 'Categories', value: stats?.totalCategories ?? 0 },
          { label: 'Open challenges', value: stats?.openChallenges ?? 0 },
          { label: 'Ideas funded', value: stats?.ideasFunded ?? 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <p className="font-display text-2xl font-extrabold text-ink-900">
              <AnimatedCounter value={item.value} />
            </p>
            <p className="mt-1 text-xs text-ink-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">Published innovations by category</h2>
          <div className="mt-5 space-y-3">
            {breakdown?.byCategory.map((c) => (
              <div key={c.categoryId} className="flex items-center gap-3">
                <CategoryIcon name={iconFor(c.categoryId)} className="h-4 w-4 shrink-0 text-brand-600" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-ink-600">
                    <span>{locale === 'bn' ? c.nameBn : c.nameEn}</span>
                    <span className="font-semibold text-ink-800">{c.count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-ink-50">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!breakdown?.byCategory.length && <p className="text-sm text-ink-400">No published innovations yet.</p>}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">Published innovations by division</h2>
          <div className="mt-5 space-y-3">
            {breakdown?.byRegion.map((r) => (
              <div key={r.regionId}>
                <div className="flex justify-between text-xs text-ink-600">
                  <span>{locale === 'bn' ? r.nameBn : r.nameEn}</span>
                  <span className="font-semibold text-ink-800">{r.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-ink-50">
                  <div
                    className="h-2 rounded-full bg-sun-500"
                    style={{ width: `${(r.count / maxRegionCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!breakdown?.byRegion.length && <p className="text-sm text-ink-400">No published innovations yet.</p>}
          </div>

          <h2 className="mt-10 font-display text-xl font-bold text-ink-900">By development stage</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {breakdown?.byStage.map((s) => (
              <span key={s.stage} className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-700">
                {s.stage.replace(/_/g, ' ')} · <span className="font-bold">{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
