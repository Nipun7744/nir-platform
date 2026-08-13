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

        <div className="flex flex-wrap gap-3">
          {categories?.map((category) => (
            <Link
              key={category.id}
              href={`/repository?categoryId=${category.id}`}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-greenline bg-white px-4 py-[9px] text-sm font-medium text-navy transition hover:border-nirgreen-deep hover:bg-mist"
            >
              {locale === 'bn' ? category.nameBn : category.nameEn}
              <span className="font-mono text-xs text-nirgreen-deep">{countFor(category.id)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
