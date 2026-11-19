'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Layers, Building2, BarChart3 } from 'lucide-react';
import { DriftingOrbs } from './drifting-orbs';

export function QuickLinks() {
  const t = useTranslations('home.quickLinks');
  const tHome = useTranslations('home');

  const cards = [
    { icon: Layers, title: t('browseTitle'), desc: t('browseDesc'), cta: t('browseCta'), href: '/repository' },
    { icon: Building2, title: t('orgsTitle'), desc: t('orgsDesc'), cta: t('orgsCta'), href: '/repository' },
    { icon: BarChart3, title: t('statsTitle'), desc: t('statsDesc'), cta: t('statsCta'), href: '/statistics' },
  ];

  return (
    // Accessibility (2026-11-17, no visual change): a visually hidden h2 so the card titles (h3) no
    // longer jump straight from the page h1; the cards are a list; the decorative arrow is hidden.
    <section className="relative isolate overflow-hidden bg-white py-[88px]" aria-labelledby="quick-links-heading">
      {/* Drifting green light (user request, 2026-11-19), same as the hero. The cards are frosted
          (bg-white/80 + backdrop blur) so the glow shows softly through them; inside a card the tint
          is at most ~5%, so the 14px green CTA text stays ≥ 4.5:1. */}
      <DriftingOrbs
        className="opacity-60 sm:opacity-100"
        orbs={[
          { place: '-top-40 left-[4%] w-[460px]', rgb: '0,168,107', alpha: 0.22, anim: 'animate-orb-b' },
          { place: '-bottom-48 right-[4%] w-[480px]', rgb: '52,211,153', alpha: 0.2, anim: 'animate-orb-a' },
          { place: '-top-16 left-[40%] w-[340px]', rgb: '163,230,53', alpha: 0.14, anim: 'animate-orb-c' },
        ]}
      />
      <h2 id="quick-links-heading" className="sr-only">
        {tHome('quickLinksHeading')}
      </h2>
      <ul className="container-page grid gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <li key={card.title} className="flex">
          <Link
            href={card.href}
            className="focus-ring group flex min-w-0 flex-1 flex-col gap-2.5 rounded-[18px] border border-greenline bg-white/80 p-[30px_28px] backdrop-blur-sm transition hover:-translate-y-[3px] hover:border-nirgreen-deep hover:shadow-glow"
            style={{ padding: '30px 28px' }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-nirgreen-deep transition group-hover:shadow-[0_0_0_5px_rgba(0,168,107,.08)]">
              <card.icon className="h-[22px] w-[22px]" aria-hidden />
            </span>
            <h3 className="font-sans text-lg font-bold text-navy">{card.title}</h3>
            <p className="m-0 text-sm text-slate">{card.desc}</p>
            <span className="mt-auto text-sm font-semibold text-nirgreen-deep">
              {card.cta} <span aria-hidden="true">→</span>
            </span>
          </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
