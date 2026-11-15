'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight, CalendarClock, Landmark, Send, Star } from 'lucide-react';
import { useChallenges } from '@/hooks/use-content';
import { useGeneralSubmissionOpen } from '@/hooks/use-settings';
import { useChallengeText } from '@/lib/challenge-i18n';
import clsx from 'clsx';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-brand-100 text-brand-700',
  UPCOMING: 'bg-sun-100 text-sun-600',
  CLOSED: 'bg-ink-50 text-ink-500',
  EVALUATING: 'bg-clay-50 text-clay-600',
  COMPLETED: 'bg-ink-50 text-ink-400',
};

export default function ChallengesPage() {
  const t = useTranslations('challenges.list');
  const tStatus = useTranslations('challengeDetail.status');
  const tCommon = useTranslations('common');
  const tx = useChallengeText();
  const { data: challenges, isLoading } = useChallenges();
  const generalSubmissionOpen = useGeneralSubmissionOpen();
  const shortDate = (v: string) => tx.date(v, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="container-page py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{t('eyebrow')}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-ink-600">{t('intro')}</p>

      {generalSubmissionOpen && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-ink-100 bg-mist px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-700">{t('generalPrompt')}</p>
          <Link href="/submit" className="focus-ring inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy hover:text-white">
            {t('generalCta')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="mt-10 space-y-5">
        {isLoading && <p className="text-ink-400">{tCommon('loading')}</p>}
        {challenges?.map((challenge) => {
          const title = tx.title(challenge);
          return (
            <article
              key={challenge.id}
              className="relative flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-card transition hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {challenge.bannerImageUrl && (
                  <div className="relative hidden h-20 w-32 shrink-0 overflow-hidden rounded-xl sm:block">
                    <Image src={challenge.bannerImageUrl} alt="" fill className="object-cover" sizes="128px" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[challenge.status])}>
                      {tStatus.has(challenge.status) ? tStatus(challenge.status) : challenge.status}
                    </span>
                    {challenge.isFeatured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2.5 py-1 text-xs font-semibold text-sun-600">
                        <Star className="h-3 w-3 fill-sun-500 text-sun-500" /> {t('featured')}
                      </span>
                    )}
                    {challenge.acceptingSubmissions && (
                      <span className="inline-flex rounded-full bg-nirgreen-deep/10 px-2.5 py-1 text-xs font-semibold text-nirgreen-dark">{t('accepting')}</span>
                    )}
                  </div>
                  <h2 className="mt-3 font-display text-lg font-bold text-ink-900">
                    <Link href={`/challenges/${challenge.slug}`} className="focus-ring hover:text-brand-700">
                      {title}
                    </Link>
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                    <Landmark className="h-3.5 w-3.5 shrink-0" /> {tx.organizer(challenge)}
                  </p>
                  {challenge.deadline && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-700">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                      {challenge.startDate && `${shortDate(challenge.startDate)} – `}
                      {shortDate(challenge.deadline)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                {challenge.acceptingSubmissions && (
                  <Link
                    href={`/challenges/${challenge.slug}/submit`}
                    aria-label={t('submitAria', { title })}
                    className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    <Send className="h-4 w-4" /> {t('submit')}
                  </Link>
                )}
                <Link href={`/challenges/${challenge.slug}`} className="focus-ring text-center text-sm font-semibold text-brand-700 hover:underline">
                  {t('viewDetails')}
                </Link>
              </div>
            </article>
          );
        })}
        {!isLoading && challenges?.length === 0 && <p className="text-ink-400">{t('empty')}</p>}
      </div>
    </div>
  );
}
