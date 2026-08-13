'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { useFaqs, type FaqDto } from '@/hooks/use-content';

export default function FaqPage() {
  const t = useTranslations('faq');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data, isLoading } = useFaqs();
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byCategory = new Map<string, FaqDto[]>();
    for (const item of data ?? []) {
      const list = byCategory.get(item.categoryLabel) ?? [];
      list.push(item);
      byCategory.set(item.categoryLabel, list);
    }
    return Array.from(byCategory.entries());
  }, [data]);

  return (
    <div className="container-page max-w-3xl py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{t('eyebrow')}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">{t('title')}</h1>
      <p className="mt-5 leading-relaxed text-ink-700">{t('description')}</p>

      <div className="mt-10 space-y-10">
        {isLoading && <p className="text-ink-400">{tCommon('loading')}</p>}

        {!isLoading && groups.length === 0 && <p className="text-ink-400">{tCommon('noResults')}</p>}

        {groups.map(([categoryLabel, items]) => (
          <section key={categoryLabel}>
            <h2 className="font-display text-lg font-bold text-ink-900">{categoryLabel}</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => {
                const open = openId === item.id;
                const question = locale === 'bn' && item.questionBn ? item.questionBn : item.questionEn;
                const answer = locale === 'bn' && item.answerBn ? item.answerBn : item.answerEn;
                return (
                  <div key={item.id} className="rounded-2xl border border-ink-100 bg-white shadow-card">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : item.id)}
                      aria-expanded={open}
                      className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="flex items-center gap-3 font-display text-base font-bold text-ink-900">
                        <HelpCircle className="h-5 w-5 shrink-0 text-brand-600" />
                        {question}
                      </span>
                      <ChevronDown
                        className={clsx('h-5 w-5 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')}
                      />
                    </button>
                    {open && (
                      <p className="px-5 pb-5 pl-[52px] text-sm leading-relaxed text-ink-700">{answer}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
