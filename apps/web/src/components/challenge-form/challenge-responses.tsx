import { FileText, Trophy } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { ChallengeResponseEntry } from './types';

function display(entry: ChallengeResponseEntry) {
  if (entry.value === null || entry.value === undefined || entry.value === '') return <span className="text-ink-400">—</span>;
  if (typeof entry.value === 'boolean') return entry.value ? 'Yes' : 'No';
  if (Array.isArray(entry.value)) return entry.value.length ? entry.value.join(', ') : <span className="text-ink-400">—</span>;
  return String(entry.value);
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
  challenge?: { slug: string; titleEn: string } | null;
  responses?: ChallengeResponseEntry[] | null;
}) {
  if (!challenge || !responses?.length) return null;
  return (
    <section className="rounded-2xl border border-brand-300/60 bg-white p-6 shadow-card">
      <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
        <Trophy className="h-4 w-4" /> Challenge submission
      </p>
      <h2 className="mt-1 font-display text-lg font-bold text-ink-900">
        <Link href={`/challenges/${challenge.slug}`} className="hover:text-brand-700">
          {challenge.titleEn}
        </Link>
      </h2>
      <dl className="mt-4 divide-y divide-ink-100">
        {responses.map((entry) => (
          <div key={entry.key} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-ink-500">{entry.label}</dt>
            <dd className="whitespace-pre-line break-words text-sm text-ink-800">
              {entry.files?.length ? (
                <ul className="space-y-1">
                  {entry.files.map((f) => (
                    <li key={f.url}>
                      <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
                        <FileText className="h-4 w-4" /> {f.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                display(entry)
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
