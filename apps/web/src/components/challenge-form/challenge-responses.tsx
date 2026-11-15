import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChallengeText } from '@/lib/challenge-i18n';
import { Link } from '@/i18n/navigation';
import { AttachmentList } from '@/components/ui/attachment-list';
import type { ChallengeResponseEntry } from './types';

function display(entry: ChallengeResponseEntry, yesNo: (v: boolean) => string) {
  if (entry.value === null || entry.value === undefined || entry.value === '') return <span className="text-ink-400">—</span>;
  if (typeof entry.value === 'boolean') return yesNo(entry.value);
  if (Array.isArray(entry.value)) return entry.value.length ? entry.value.join(', ') : <span className="text-ink-400">—</span>;
  return String(entry.value);
}

/**
 * A challenge submission's InnovationAttachment rows that are NOT already listed under a form
 * answer (e.g. files the submitter added later from the edit page). Reviewer pages show these as
 * "Supporting documents" so nothing is listed twice. If the answers aren't visible to this viewer
 * (API strips `challengeResponses`), all attachments are returned.
 */
export function challengeExtraAttachments(innovation: {
  attachments?: any[] | null;
  challengeResponses?: ChallengeResponseEntry[] | null;
}) {
  const shown = new Set((innovation.challengeResponses ?? []).flatMap((e) => (e.files ?? []).map((f) => f.url)));
  return (innovation.attachments ?? []).filter((a) => !shown.has(a.url));
}

/**
 * Read-only view of a challenge submission's answers — shown to the submitter and to reviewers /
 * admins (the API returns `challengeResponses: null` for everyone else, so this renders nothing
 * for the public). Labels come from the stored snapshot, so it reads correctly even after the
 * admin later edits the challenge's form.
 */
export function ChallengeResponses({
  challenge,
  responses,
}: {
  challenge?: { slug: string; titleEn: string; titleBn?: string | null } | null;
  responses?: ChallengeResponseEntry[] | null;
}) {
  const t = useTranslations('challenges.responses');
  const tx = useChallengeText();
  if (!challenge || !responses?.length) return null;
  return (
    <section className="rounded-2xl border border-brand-300/60 bg-white p-6 shadow-card">
      <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
        <Trophy className="h-4 w-4" /> {t('heading')}
      </p>
      <h2 className="mt-1 font-display text-lg font-bold text-ink-900">
        <Link href={`/challenges/${challenge.slug}`} className="hover:text-brand-700">
          {tx.pick(challenge.titleEn, challenge.titleBn)}
        </Link>
      </h2>
      <dl className="mt-4 divide-y divide-ink-100">
        {responses.map((entry) => (
          <div key={entry.key} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm font-medium text-ink-500">{entry.label}</dt>
            <dd className="min-w-0 whitespace-pre-line break-words text-sm text-ink-800">
              {entry.files?.length ? (
                // Images as attachment rows with an on-click lightbox, never inline previews.
                <div className="whitespace-normal">
                  <AttachmentList compact items={entry.files} />
                </div>
              ) : (
                display(entry, (v) => (v ? t('yes') : t('no')))
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
