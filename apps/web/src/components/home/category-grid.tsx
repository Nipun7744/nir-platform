'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useCategories, usePublicBreakdown } from '@/hooks/use-content';

export function CategoryGrid() {
  const t = useTranslations('home.categories');
  const locale = useLocale();
  const { data: categories } = useCategories();
  const { data: breakdown } = usePublicBreakdown();

  const countFor = (categoryId: string) => breakdown?.byCategory.find((c) => c.categoryId === categoryId)?.count ?? 0;

  return (
    <section className="bg-white py-[88px]">
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2.5 font-mono text-xs uppercase tracking-[0.08em] text-nirgreen-deep">{t('eyebrow')}</p>
            <h2 className="max-w-[560px] font-display text-[2.25rem] font-bold text-navy">{t('title')}</h2>
          </div>
          <Link href="/repository" className="focus-ring px-2.5 text-sm font-semibold text-nirgreen-deep hover:underline">
            {t('cta')}
          </Link>
        </div>

        {/* A list (2026-11-17). The mobile-only hiding moved from the link to its <li> so hidden
            chips leave no empty flex item behind — same layout as before. The bare count is read
            as "12 innovations"; visually it is unchanged. */}
        <ul className="flex flex-wrap gap-3">
          {categories?.map((category, index) => (
            <li key={category.id} className={index < 6 ? 'flex' : 'hidden sm:flex'}>
              <Link
                href={`/repository?categoryId=${category.id}`}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-greenline bg-white px-4 py-[9px] text-sm font-medium text-navy transition hover:border-nirgreen-deep hover:bg-mist"
              >
                {locale === 'bn' ? category.nameBn : category.nameEn}
                <span className="font-mono text-xs text-nirgreen-deep" aria-hidden="true">
                  {countFor(category.id)}
                </span>
                <span className="sr-only">({t('countLabel', { count: countFor(category.id) })})</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
