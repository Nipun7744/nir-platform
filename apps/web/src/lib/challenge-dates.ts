import type { ChallengeDto } from '@/hooks/use-content';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days left to apply, or null once the deadline has passed (or there is none).
 * Matches the API's submission window (challenge-rules.ts): submissions are accepted until the
 * end of the deadline day in UTC, so 0 means "today is the last day".
 */
export function challengeDaysLeft(deadline?: string | null, now: Date = new Date()): number | null {
  if (!deadline) return null;
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;
  const endOfDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) + DAY_MS;
  const remaining = endOfDay - now.getTime();
  if (remaining <= 0) return null;
  return Math.floor(remaining / DAY_MS);
}

/**
 * The challenge to promote on the homepage banner and the site-wide popup: the featured open,
 * active challenge, else the first open, active one. Undefined when none is open.
 */
export function pickPromotedChallenge(challenges?: ChallengeDto[]): ChallengeDto | undefined {
  const open = challenges?.filter((c) => c.status === 'OPEN' && c.isActive !== false);
  return open?.find((c) => c.isFeatured) ?? open?.[0];
}
