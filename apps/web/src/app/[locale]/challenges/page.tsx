'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { CalendarClock, Landmark, Star } from 'lucide-react';
import { useChallenges } from '@/hooks/use-content';
import clsx from 'clsx';

function formatChallengeDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-brand-100 text-brand-700',
  UPCOMING: 'bg-sun-100 text-sun-600',
  CLOSED: 'bg-ink-50 text-ink-500',
  EVALUATING: 'bg-clay-50 text-clay-600',
  COMPLETED: 'bg-ink-50 text-ink-400',
};

export default function ChallengesPage() {
  const { data: challenges, isLoading } = useChallenges();

  return (
    <div className="container-page py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Innovation Challenges & Calls</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">Open calls for innovation</h1>
      <p className="mt-3 max-w-2xl text-ink-600">
        Government agencies and partners regularly launch challenges to solve specific public problems — with funding, mentorship, and a path to pilot implementation.
      </p>

      <div className="mt-10 space-y-5">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {challenges?.map((challenge) => (
          <Link
            key={challenge.id}
            href={`/challenges/${challenge.slug}`}
            className="focus-ring flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 items-center gap-4">
              {challenge.bannerImageUrl && (
                <div className="relative hidden h-20 w-32 shrink-0 overflow-hidden rounded-xl sm:block">
                  <Image src={challenge.bannerImageUrl} alt="" fill className="object-cover" sizes="128px" />
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[challenge.status])}>
                    {challenge.status}
                  </span>
                  {challenge.isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2.5 py-1 text-xs font-semibold text-sun-600">
                      <Star className="h-3 w-3 fill-sun-500 text-sun-500" /> Featured
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-lg font-bold text-ink-900">{challenge.titleEn}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                  <Landmark className="h-3.5 w-3.5" /> {challenge.organizingAgency}
                </p>
              </div>
            </div>
            {challenge.deadline && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
                <CalendarClock className="h-4 w-4 text-brand-600" />
                {challenge.startDate && `${formatChallengeDate(challenge.startDate)} – `}
                {formatChallengeDate(challenge.deadline)}
              </div>
            )}
          </Link>
        ))}
        {!isLoading && challenges?.length === 0 && <p className="text-ink-400">No challenges published yet.</p>}
      </div>
    </div>
  );
}
