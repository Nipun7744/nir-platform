'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Role } from '@nir/shared';
import { useAuthStore } from '@/store/auth-store';
import { useOutreachChallenges } from '@/hooks/use-outreach';
import { ParticipantsPanel } from '@/components/admin/outreach/participants-panel';
import { Composer } from '@/components/admin/outreach/composer';
import { HistoryPanel } from '@/components/admin/outreach/history-panel';
import { Card, ErrorNote, inputCls } from '@/components/admin/outreach/outreach-ui';

/**
 * Admin "Participants & messaging" (2026-11-18): pick a challenge → see/export its participants →
 * send them a bulk email/SMS (admin OTP-confirmed) → follow the communication log. Platform and
 * System admins only (nav + API both enforce it). Fully translated (messages: `outreach.*`).
 */
function OutreachPageInner() {
  const t = useTranslations('outreach');
  const locale = useLocale();
  const qc = useQueryClient();
  const params = useSearchParams();
  const { data: challenges, isLoading, isError } = useOutreachChallenges();
  const [challengeId, setChallengeId] = useState(params.get('challengeId') ?? '');

  // Drop a stale id (e.g. a deleted challenge in a bookmarked URL).
  useEffect(() => {
    if (challenges && challengeId && !challenges.some((c) => c.id === challengeId)) setChallengeId('');
  }, [challenges, challengeId]);

  const title = (c: { titleEn: string; titleBn: string | null }) => (locale === 'bn' && c.titleBn ? c.titleBn : c.titleEn);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{t('pageTitle')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-600">{t('pageIntro')}</p>
      </div>

      <Card id="challenge-title" title={t('challengeLabel')}>
        {isError && <ErrorNote>{t('loadError')}</ErrorNote>}
        <label htmlFor="outreach-challenge" className="sr-only">
          {t('challengeLabel')}
        </label>
        <select
          id="outreach-challenge"
          value={challengeId}
          onChange={(e) => {
            setChallengeId(e.target.value);
            // Keep the choice in the URL so a reload or a shared link reopens the same challenge.
            const url = new URL(window.location.href);
            if (e.target.value) url.searchParams.set('challengeId', e.target.value);
            else url.searchParams.delete('challengeId');
            window.history.replaceState(null, '', url);
          }}
          disabled={isLoading}
          className={`${inputCls} max-w-2xl`}
        >
          <option value="">{isLoading ? t('loading') : challenges?.length ? t('challengePlaceholder') : t('noChallenges')}</option>
          {challenges?.map((c) => (
            <option key={c.id} value={c.id}>
              {title(c)} — {t('participantsCount', { count: c.participantCount })}
            </option>
          ))}
        </select>
      </Card>

      {challengeId && (
        <>
          <ParticipantsPanel key={`p-${challengeId}`} challengeId={challengeId} />
          <Composer challengeId={challengeId} onQueued={() => qc.invalidateQueries({ queryKey: ['outreach', 'history'] })} />
        </>
      )}
      <HistoryPanel key={`h-${challengeId}`} challengeId={challengeId} />
    </div>
  );
}

export default function OutreachPage() {
  const t = useTranslations('outreach');
  const user = useAuthStore((s) => s.user);
  // Convenience only — every /admin/outreach API route is guarded server-side (403 for others).
  if (user && !user.roles.some((r) => r === Role.PLATFORM_ADMIN || r === Role.SYSTEM_ADMIN)) {
    return <ErrorNote>{t('err_forbidden')}</ErrorNote>;
  }
  return (
    <Suspense fallback={null}>
      <OutreachPageInner />
    </Suspense>
  );
}
