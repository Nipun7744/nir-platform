'use client';

import { useTranslations } from 'next-intl';
import { usePublicStats } from '@/hooks/use-content';
import { AnimatedCounter } from '@/components/ui/animated-counter';

export function StatsStrip() {
  const t = useTranslations('home.stats');
  const { data } = usePublicStats();

  const items = [
    { key: 'innovations', value: data?.totalInnovations ?? 0, label: t('innovations') },
    { key: 'innovators', value: data?.totalInnovators ?? 0, label: t('innovators') },
    { key: 'organizations', value: data?.totalOrganizations ?? 0, label: t('organizations') },
    { key: 'challenges', value: data?.openChallenges ?? 0, label: t('challenges') },
    { key: 'funded', value: data?.ideasFunded ?? 0, label: t('funded') },
  ];

  return (
    <section className="bg-navy text-white" aria-label="National innovation statistics">
      <div className="container-page grid grid-cols-2 items-center gap-7 py-[26px] sm:grid-cols-3 lg:grid-cols-[auto_repeat(5,1fr)]">
        <div className="col-span-2 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] text-[#9DB3D6] sm:col-span-3 lg:col-span-1">
          <span className="relative inline-block h-2 w-2 shrink-0 rounded-full bg-flagred">
            <span className="absolute -inset-1 animate-live-pulse rounded-full border-[1.5px] border-flagred" />
          </span>
          {t('label')}
        </div>
        {items.map((item) => (
          <div key={item.key}>
            <b className="block font-display text-2xl font-bold tracking-[-0.01em]">
              <AnimatedCounter value={item.value} />
            </b>
            <span className="text-xs tracking-[0.04em] text-[#9DB3D6]">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
