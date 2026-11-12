/**
 * Bangladeshi mobile numbers. Accepts the common ways people type them —
 * `01712345678`, `+8801712345678`, `8801712345678`, with spaces/dashes — and
 * returns the canonical E.164 form `+8801712345678`, or `null` if it isn't a
 * valid BD mobile number (operator prefixes 013–019).
 */
export function normalizeBdMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  const compact = input.replace(/[\s\-().]/g, '');
  const match = compact.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
  return match ? `+88${match[1]}` : null;
}

/** The forms an SMS gateway might want, derived from an E.164 BD number. */
export function bdMobileForms(e164: string) {
  const local = e164.replace(/^\+88/, ''); // 01XXXXXXXXX
  return {
    e164, // +8801XXXXXXXXX
    international: `88${local}`, // 8801XXXXXXXXX — what most BD aggregators expect
    local,
  };
}

/** `+8801712345678` → `+880171****678` — for showing where a code was sent. */
export function maskPhone(e164: string): string {
  return e164.length > 8 ? `${e164.slice(0, 7)}****${e164.slice(-3)}` : e164;
}

/** `someone@example.com` → `so*****@example.com`. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}
