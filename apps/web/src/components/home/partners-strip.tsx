'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { usePartners } from '@/hooks/use-content';

export function PartnersStrip() {
  const t = useTranslations('home.partners');
  const { data } = usePartners();

  return (
    <section className="border-t border-greenline bg-mist py-[88px]">
      <div className="container-page">
        <p className="mb-[34px] text-center font-mono text-xs uppercase tracking-[0.08em] text-slate">{t('eyebrow')}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-11">
          {data?.map((partner) => (
            <div key={partner.id} className="relative h-[46px] w-24 grayscale opacity-55 transition hover:grayscale-0 hover:opacity-100">
              <Image src={partner.logoUrl} alt={partner.name} fill className="object-contain" sizes="96px" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
