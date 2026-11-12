/**
 * Validates a post-login `?next=` return path (e.g. back to /challenges/:slug/submit after
 * sign-in). Only same-site, locale-less absolute paths are allowed — never another origin
 * (`//evil.com`, `/\evil.com`, `https://…`), which would make sign-in an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (/[\r\n]/.test(raw)) return null;
  return raw;
}

/** `/sign-in` or `/register`, carrying a validated `next` along. */
export function withNext(path: string, next: string | null) {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
