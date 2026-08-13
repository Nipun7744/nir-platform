'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useChallenges } from '@/hooks/use-content';

function formatBannerDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export function ChallengeBanner() {
  const t = useTranslations('home.challenge');
  const { data } = useChallenges();
  const openChallenges = data?.filter((c) => c.status === 'OPEN');
  const challenge = openChallenges?.find((c) => c.isFeatured) ?? openChallenges?.[0] ?? data?.[0];

  if (!challenge) return null;

  return (
    <section className="bg-navy py-[88px]">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-nirgreen-deep px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-white">
            <span className="relative inline-block h-2 w-2 shrink-0 rounded-full bg-white">
              <span className="absolute -inset-1 animate-live-pulse rounded-full border-[1.5px] border-white" />
            </span>
            {t('openForApplications')}
          </span>
          <h2 className="my-3.5 font-display text-[2.25rem] font-bold text-white">{challenge.titleEn}</h2>
          <p className="max-w-[56ch] text-[#B9C7DE]">{challenge.descriptionEn}</p>

          <div className="my-[26px] flex flex-wrap gap-9">
            {challenge.deadline && (
              <div>
                <b className="block font-mono text-sm text-white">
                  {challenge.startDate && `${formatBannerDate(challenge.startDate)} – `}
                  {formatBannerDate(challenge.deadline)}
                </b>
                <span className="text-xs uppercase tracking-[0.08em] text-[#9DB3D6]">
                  {challenge.startDate ? t('timeline') : t('deadline')}
                </span>
              </div>
            )}
            {challenge.prizeInfoEn && (
              <div>
                <b className="block font-mono text-sm text-white">{challenge.prizeInfoEn.split(',')[0].replace('Prototype Development Grant (up to ', '').replace(')', '').toUpperCase()}</b>
                <span className="text-xs uppercase tracking-[0.08em] text-[#9DB3D6]">{t('prototypeGrant')}</span>
              </div>
            )}
            <div>
              <b className="block font-mono text-sm text-white">{challenge.organizingAgency.replace('Aspire to Innovate (a2i), ', 'a2i · ').toUpperCase()}</b>
              <span className="text-xs uppercase tracking-[0.08em] text-[#9DB3D6]">{t('organizer')}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3.5">
            <Link href="/submit" className="focus-ring rounded-full bg-nirgreen-deep px-[26px] py-[13px] text-base font-semibold text-white transition hover:bg-nirgreen-dark">
              {t('applyNow')}
            </Link>
            <Link
              href={`/challenges/${challenge.slug}`}
              className="focus-ring rounded-full border-[1.5px] border-white/50 px-[26px] py-[13px] text-base font-semibold text-white transition hover:bg-white hover:text-navy"
            >
              {t('viewDetails')}
            </Link>
          </div>
        </div>

        <div className="relative hidden aspect-[4/3] overflow-hidden rounded-[18px] shadow-[0_2px_6px_rgba(19,36,63,.08),0_20px_48px_-16px_rgba(19,36,63,.24)] lg:block">
          <Image src={challenge.bannerImageUrl || '/news/water-innovation-challenge-pilot.jpg'} alt="" fill className="object-cover" sizes="480px" />
        </div>
      </div>
    </section>
  );
}
