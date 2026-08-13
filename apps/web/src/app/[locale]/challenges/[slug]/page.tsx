'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, CalendarClock, Landmark, Banknote, Star } from 'lucide-react';
import { useChallenge } from '@/hooks/use-content';

function formatChallengeDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ChallengeDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { data: challenge, isLoading } = useChallenge(slug);

  if (isLoading) return <div className="container-page py-24 text-center text-ink-400">Loading…</div>;
  if (!challenge) return <div className="container-page py-24 text-center text-ink-400">Challenge not found.</div>;

  return (
    <div className="container-page max-w-3xl py-14">
      <Link href="/challenges" className="focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to challenges
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">{challenge.status}</span>
        {challenge.isFeatured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2.5 py-1 text-xs font-semibold text-sun-600">
            <Star className="h-3 w-3 fill-sun-500 text-sun-500" /> Featured
          </span>
        )}
      </div>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-ink-900">{challenge.titleEn}</h1>

      {challenge.bannerImageUrl && (
        <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-ink-100">
          <Image src={challenge.bannerImageUrl} alt="" fill className="object-cover" sizes="800px" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-600">
        <span className="flex items-center gap-1.5"><Landmark className="h-4 w-4 text-brand-600" /> {challenge.organizingAgency}</span>
        {challenge.deadline && (
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-brand-600" />
            {challenge.startDate
              ? `Timeline: ${formatChallengeDate(challenge.startDate)} – ${formatChallengeDate(challenge.deadline)}`
              : `Deadline: ${formatChallengeDate(challenge.deadline)}`}
          </span>
        )}
        {challenge.prizeInfoEn && (
          <span className="flex items-center gap-1.5"><Banknote className="h-4 w-4 text-brand-600" /> {challenge.prizeInfoEn}</span>
        )}
      </div>

      <p className="mt-6 leading-relaxed text-ink-700">{challenge.descriptionEn}</p>

      <Link
        href="/submit"
        className="focus-ring mt-8 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Apply now
      </Link>
    </div>
  );
}
