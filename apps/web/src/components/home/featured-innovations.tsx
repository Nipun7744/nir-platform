'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFeaturedInnovations } from '@/hooks/use-content';
import { InnovationCard } from '@/components/ui/innovation-card';

export function FeaturedInnovations() {
  const t = useTranslations('home.featured');
  const { data, isLoading } = useFeaturedInnovations(3);
  const tHome = useTranslations('home');

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

        {/* A list of cards (no visual change); placeholders are hidden from assistive tech and a
            polite status says the cards are loading (2026-11-17). */}
        <p role="status" className="sr-only">
          {isLoading ? tHome('loadingFeatured') : ''}
        </p>
        <ul className="grid gap-[26px] sm:grid-cols-2 lg:grid-cols-3" aria-busy={isLoading || undefined}>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i} aria-hidden="true" className="h-80 animate-pulse rounded-[18px] bg-white/60" />
            ))}
          {data?.map((innovation, i) => (
            <li key={innovation.id} className="flex">
              {/* min-w-0: as a flex item the card would otherwise grow past a narrow column (it was a grid item). */}
              <InnovationCard innovation={innovation} index={i} className="min-w-0 flex-1" />
            </li>
          ))}
        </ul>

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
