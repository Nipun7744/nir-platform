'use client';

import type { MouseEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useCategories, usePublicBreakdown } from '@/hooks/use-content';

/**
 * Hover float for the category chips (user request, 2026-11-19): the hovered chip drifts a few
 * pixels toward the cursor (±3px horizontally, ±2px vertically) on top of a 3px lift and 3% scale,
 * and eases back to rest when the mouse leaves. The offset lives in per-chip CSS variables, so each
 * chip moves independently; the transform itself is pure CSS (see the chip's className).
 */
function floatTowardCursor(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1 … 1
  const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  el.style.setProperty('--mx', `${(x * 3).toFixed(2)}px`);
  el.style.setProperty('--my', `${(y * 2).toFixed(2)}px`);
}

function resetFloat(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--mx', '0px');
  e.currentTarget.style.setProperty('--my', '0px');
}

export function CategoryGrid() {
  const t = useTranslations('home.categories');
  const locale = useLocale();
  const { data: categories } = useCategories();
  const { data: breakdown } = usePublicBreakdown();

  const countFor = (categoryId: string) => breakdown?.byCategory.find((c) => c.categoryId === categoryId)?.count ?? 0;

  return (
    <section
      className="bg-white py-[88px]"
      style={{ backgroundImage: 'radial-gradient(640px 300px at 100% 0%, rgba(0,168,107,.05), transparent 70%)' }}
    >
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
                onMouseMove={floatTowardCursor}
                onMouseLeave={resetFloat}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-greenline bg-white px-4 py-[9px] text-sm font-medium text-navy transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:border-nirgreen-deep hover:bg-mist hover:shadow-glow-sm hover:[transform:translate3d(var(--mx,0px),calc(var(--my,0px)_-_3px),0)_scale(1.03)] motion-reduce:hover:transform-none"
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
