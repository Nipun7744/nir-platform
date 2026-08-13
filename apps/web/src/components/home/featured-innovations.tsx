'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFeaturedInnovations } from '@/hooks/use-content';
import { InnovationCard } from '@/components/ui/innovation-card';

export function FeaturedInnovations() {
  const t = useTranslations('home.featured');
  const { data, isLoading } = useFeaturedInnovations(3);

  return (
    <section className="bg-mist py-[88px]">
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[560px]">
            <p className="mb-2.5 font-mono text-xs uppercase tracking-[0.08em] text-nirgreen-deep">{t('eyebrow')}</p>
            <h2 className="font-display text-[2.25rem] font-bold text-navy">{t('title')}</h2>
            <p className="mt-2.5 max-w-[520px] text-slate">{t('description')}</p>
          </div>
          <Link
            href="/repository"
            className="focus-ring hidden shrink-0 items-center gap-2 rounded-full border-[1.5px] border-navy px-[18px] py-[9px] text-sm font-semibold text-navy transition hover:bg-navy hover:text-white sm:inline-flex"
          >
            {t('cta')}
          </Link>
        </div>

        <div className="grid gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-[18px] bg-white/60" />
            ))}
          {data?.map((innovation, i) => (
            <InnovationCard key={innovation.id} innovation={innovation} index={i} />
          ))}
        </div>

        <Link
          href="/repository"
          className="focus-ring mt-8 flex items-center justify-center gap-2 rounded-full border-[1.5px] border-navy px-[18px] py-[9px] text-sm font-semibold text-navy sm:hidden"
        >
          {t('cta')}
        </Link>
      </div>
    </section>
  );
}
