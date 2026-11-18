import { isEmail } from 'class-validator';
import { normalizeBdMobile } from '../common/utils/phone';

/**
 * Pure helpers for admin bulk messages (no Nest/Prisma, so they're unit-tested directly in
 * test/outreach-rules.test.js). Placeholders use `{{name}}` syntax, case-insensitive, spaces
 * allowed inside the braces.
 */

export const PLACEHOLDERS = ['name', 'challenge', 'irn'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];
export type PlaceholderValues = Record<Placeholder, string>;

export const LIMITS = {
  subjectMax: 200,
  emailBodyMax: 10_000,
  /** Before placeholders are filled; long names can add a little. */
  smsBodyMax: 480,
  /** Rendered SMS may not exceed this many segments (cost guard). */
  smsMaxSegments: 8,
} as const;

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_]+)\s*\}\}/g;

/** Placeholder names used in `text` that aren't supported (lower-cased, de-duplicated). */
export function unknownPlaceholders(text: string): string[] {
  const bad = new Set<string>();
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    const key = m[1].toLowerCase();
    if (!(PLACEHOLDERS as readonly string[]).includes(key)) bad.add(key);
  }
  return [...bad];
}

export function renderPlaceholders(text: string, values: PlaceholderValues): string {
  return text.replace(PLACEHOLDER_RE, (whole, raw: string) => {
    const key = raw.toLowerCase() as Placeholder;
    return (PLACEHOLDERS as readonly string[]).includes(key) ? values[key] : whole;
  });
}

// GSM 03.38 basic set + extension table (extension chars count double).
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€';

/** SMS encoding and segment count (GSM-7: 160 / 153 per part; UCS-2, e.g. Bangla: 70 / 67). */
export function smsSegments(text: string): { encoding: 'GSM-7' | 'UCS-2'; units: number; segments: number } {
  let units = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) units += 1;
    else if (GSM_EXT.includes(ch)) units += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) return { encoding: 'GSM-7', units, segments: units <= 160 ? 1 : Math.ceil(units / 153) };
  // UCS-2 counts UTF-16 code units (astral characters such as emoji take two).
  const u = text.length;
  return { encoding: 'UCS-2', units: u, segments: u <= 70 ? 1 : Math.ceil(u / 67) };
}

export type AddressCheck = { ok: true; address: string } | { ok: false; address: string; reason: string };

/** Normalizes and validates a recipient address for the channel; the reason is shown to admins. */
export function checkAddress(channel: 'EMAIL' | 'SMS', raw: string | null | undefined): AddressCheck {
  const value = (raw ?? '').trim();
  if (channel === 'EMAIL') {
    if (!value) return { ok: false, address: '', reason: 'No email address on file' };
    const lower = value.toLowerCase();
    return isEmail(lower) ? { ok: true, address: lower } : { ok: false, address: value, reason: 'Invalid email address' };
  }
  if (!value) return { ok: false, address: '', reason: 'No mobile number on file' };
  const e164 = normalizeBdMobile(value);
  return e164 ? { ok: true, address: e164 } : { ok: false, address: value, reason: 'Invalid Bangladeshi mobile number' };
}
