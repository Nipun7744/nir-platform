'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { textLang } from '@/lib/text-lang';
import { usePartners } from '@/hooks/use-content';

export function PartnersStrip() {
  const t = useTranslations('home.partners');
  const { data } = usePartners();
  const locale = useLocale();

  return (
    <section className="border-t border-greenline bg-mist py-[88px]">
      <div className="container-page">
        {/* The visible "Ecosystem partners" line is now the section's h2 (same classes, so it looks
            identical — preflight resets heading size/weight) and the logos are a list (2026-11-17). */}
        <h2 id="partners-heading" className="mb-[34px] text-center font-mono text-xs uppercase tracking-[0.08em] text-slate">
          {t('eyebrow')}
        </h2>
        <ul aria-labelledby="partners-heading" className="flex flex-wrap items-center justify-center gap-x-14 gap-y-11">
          {data?.map((partner) => (
            <li key={partner.id} lang={textLang(partner.name, locale)} className="relative h-[46px] w-24 grayscale opacity-55 transition hover:grayscale-0 hover:opacity-100">
              <Image src={partner.logoUrl} alt={partner.name} fill className="object-contain" sizes="96px" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
