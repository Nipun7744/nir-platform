'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Layers, Building2, BarChart3 } from 'lucide-react';

export function QuickLinks() {
  const t = useTranslations('home.quickLinks');

  const cards = [
    { icon: Layers, title: t('browseTitle'), desc: t('browseDesc'), cta: t('browseCta'), href: '/repository' },
    { icon: Building2, title: t('orgsTitle'), desc: t('orgsDesc'), cta: t('orgsCta'), href: '/repository' },
    { icon: BarChart3, title: t('statsTitle'), desc: t('statsDesc'), cta: t('statsCta'), href: '/statistics' },
  ];

  return (
    <section className="bg-white py-[88px]">
      <div className="container-page grid gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="focus-ring group flex flex-col gap-2.5 rounded-[18px] border border-greenline bg-white p-[30px_28px] transition hover:-translate-y-[3px] hover:border-nirgreen-deep hover:shadow-card"
            style={{ padding: '30px 28px' }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-nirgreen-deep">
              <card.icon className="h-[22px] w-[22px]" aria-hidden />
            </span>
            <h3 className="font-sans text-lg font-bold text-navy">{card.title}</h3>
            <p className="m-0 text-sm text-slate">{card.desc}</p>
            <span className="mt-auto text-sm font-semibold text-nirgreen-deep">{card.cta} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
