// End-to-end tests for forgot password (POST /auth/password/forgot → /verify-code → /reset), run
// against a live API and the local dev database — same setup and conventions as
// auth-security.e2e.test.js: OTP codes are stored only as an HMAC, so the test overwrites the
// freshly sent code's hash with the HMAC of a known code. A throwaway user is created directly in
// the DB and everything is removed afterwards.
//
// Run (API must be running, with console mail/SMS — see docs/SETUP.md):  npm run test:e2e
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const API = process.env.NIR_API_URL ?? 'http://localhost:4000/api/v1';
const CAPTCHA = process.env.NIR_CAPTCHA_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX';
const prisma = new PrismaClient();

function readEnvFile() {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return { ...env, ...process.env };
}
const env = readEnvFile();
const OTP_SECRET = env.OTP_SECRET || env.JWT_ACCESS_SECRET;
const hmac = (target, code) => createHmac('sha256', OTP_SECRET).update(`${target}:${code}`).digest('hex');

async function call(method, p, body, token) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: res.status, body: json };
}

const latestOtp = (target) =>
  prisma.otpCode.findFirst({ where: { target, purpose: 'PASSWORD_RESET', consumedAt: null }, orderBy: { createdAt: 'desc' } });

/** Make the latest reset code sent to `target` equal `code`. */
async function setKnownCode(target, code) {
  const otp = await latestOtp(target);
  assert.ok(otp, `no PASSWORD_RESET OTP row for ${target}`);
  await prisma.otpCode.update({ where: { id: otp.id }, data: { codeHash: hmac(target, code) } });
}

/** Skip the per-target resend cooldown by back-dating earlier codes. */
const backdateCodes = (target) =>
  prisma.otpCode.updateMany({ where: { target, purpose: 'PASSWORD_RESET' }, data: { createdAt: new Date(Date.now() - 61_000) } });

const stamp = Date.now();
const EMAIL = `pwreset-e2e-${stamp}@example.com`;
const INACTIVE_EMAIL = `pwreset-e2e-inactive-${stamp}@example.com`;
const LOCAL = `018${String(stamp).slice(-8)}`;
const E164 = `+88${LOCAL}`;
const OLD_PASSWORD = 'OldPassword123!';
const NEW_PASSWORD = 'NewPassword456!';

const unquote = (v) => String(v ?? '').trim().replace(/^["']|["']$/g, '');
const realDeliveryOk = process.env.NIR_E2E_REAL_DELIVERY === '1';
const mailIsReal = !realDeliveryOk && !['', 'console'].includes(unquote(env.MAIL_TRANSPORT));
const smsIsReal = !realDeliveryOk && !['', 'console'].includes(unquote(env.SMS_PROVIDER));

let reachable = true;
let config;
let userId;

before(async () => {
  try {
    config = (await call('GET', '/auth/security-config')).body;
  } catch {
    reachable = false;
    return;
  }
  const passwordHash = await argon2.hash(OLD_PASSWORD);
  // Mixed-case email on purpose: the reset lookup must be case-insensitive.
  const user = await prisma.user.create({
    data: { email: EMAIL.replace('pwreset', 'PwReset'), phone: E164, passwordHash, fullName: 'Reset E2E', roles: ['INNOVATION_SUBMITTER'], isActive: true },
  });
  userId = user.id;
  await prisma.user.create({
    data: { email: INACTIVE_EMAIL, passwordHash, fullName: 'Reset E2E inactive', roles: ['INNOVATION_SUBMITTER'], isActive: false, rejectedAt: new Date() },
  });
});

after(async () => {
  if (reachable) {
    const users = await prisma.user.findMany({
      where: { email: { in: [EMAIL.replace('pwreset', 'PwReset'), INACTIVE_EMAIL] } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.otpCode.deleteMany({ where: { target: { in: [EMAIL, E164, INACTIVE_EMAIL] } } });
  }
  await prisma.$disconnect();
});

const login = (password) => call('POST', '/auth/login', { email: EMAIL.replace('pwreset', 'PwReset'), password, captchaToken: CAPTCHA });

describe('forgot password — request a code', () => {
  test('requires the CAPTCHA', async (t) => {
    if (!reachable || config.captcha.provider === 'none') return t.skip();
    const r = await call('POST', '/auth/password/forgot', { channel: 'EMAIL', email: EMAIL });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /CAPTCHA/);
  });

  test('says when no account has that email / phone', async (t) => {
    if (!reachable) return t.skip();
    const e = await call('POST', '/auth/password/forgot', { channel: 'EMAIL', email: `nobody-${stamp}@example.com`, captchaToken: CAPTCHA });
    assert.equal(e.status, 404);
    assert.match(e.body.message, /No account is registered with this email/);
    const p = await call('POST', '/auth/password/forgot', { channel: 'SMS', phone: '01399999999', captchaToken: CAPTCHA });
    assert.equal(p.status, 404);
    assert.match(p.body.message, /No account is registered with this mobile/);
  });

  test('rejects a non-Bangladeshi number', async (t) => {
    if (!reachable) return t.skip();
    const r = await call('POST', '/auth/password/forgot', { channel: 'SMS', phone: '+14155550100', captchaToken: CAPTCHA });
    assert.equal(r.status, 400);
  });

  test('refuses an inactive account', async (t) => {
    if (!reachable) return t.skip();
    const r = await call('POST', '/auth/password/forgot', { channel: 'EMAIL', email: INACTIVE_EMAIL, captchaToken: CAPTCHA });
    assert.equal(r.status, 403);
    assert.match(r.body.message, /not active/);
  });
});

describe('forgot password — email flow', () => {
  let resetToken;

  test('sends a masked code (email matched case-insensitively) and enforces the resend cooldown', async (t) => {
    if (!reachable || mailIsReal) return t.skip(mailIsReal ? 'MAIL_TRANSPORT is real — would send a real email' : undefined);
    const sent = await call('POST', '/auth/password/forgot', { channel: 'EMAIL', email: EMAIL.toUpperCase(), locale: 'en', captchaToken: CAPTCHA });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.channel, 'EMAIL');
    assert.ok(!sent.body.sentTo.includes(EMAIL.split('@')[0]), 'address is masked');
    assert.ok(sent.body.expiresInSeconds > 0 && sent.body.resendInSeconds >= 0);

    const again = await call('POST', '/auth/password/forgot', { channel: 'EMAIL', email: EMAIL, captchaToken: CAPTCHA });
    assert.equal(again.status, 429);
    assert.ok(again.body.retryAfterSeconds > 0);
  });

  test('an expired code is rejected', async (t) => {
    if (!reachable || mailIsReal) return t.skip();
    await setKnownCode(EMAIL, '111111');
    const otp = await latestOtp(EMAIL);
    await prisma.otpCode.update({ where: { id: otp.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const r = await call('POST', '/auth/password/verify-code', { channel: 'EMAIL', email: EMAIL, code: '111111' });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /expired or was not requested/);
  });

  test('resend issues a fresh code that supersedes the old one', async (t) => {
    if (!reachable || mailIsReal) return t.skip();
    await backdateCodes(EMAIL);
    const r = await call('POST', '/auth/password/forgot', { channel: 'EMAIL', email: EMAIL, locale: 'bn', captchaToken: CAPTCHA });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const live = await prisma.otpCode.count({ where: { target: EMAIL, purpose: 'PASSWORD_RESET', consumedAt: null } });
    assert.equal(live, 1, 'only the newest code is usable');
  });

  test('a wrong code is rejected with attempts left; the right one returns a reset token once', async (t) => {
    if (!reachable || mailIsReal) return t.skip();
    await setKnownCode(EMAIL, '246810');
    const wrong = await call('POST', '/auth/password/verify-code', { channel: 'EMAIL', email: EMAIL, code: '000000' });
    assert.equal(wrong.status, 400);
    assert.match(wrong.body.message, /Incorrect verification code\. 4 attempts left/);

    const bad = await call('POST', '/auth/password/verify-code', { channel: 'EMAIL', email: EMAIL, code: '12ab' });
    assert.equal(bad.status, 400, 'non-6-digit code is a validation error');

    const ok = await call('POST', '/auth/password/verify-code', { channel: 'EMAIL', email: EMAIL, code: '246810' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.ok(ok.body.resetToken);
    assert.equal(ok.body.expiresInSeconds, 600);
    resetToken = ok.body.resetToken;

    const reuse = await call('POST', '/auth/password/verify-code', { channel: 'EMAIL', email: EMAIL, code: '246810' });
    assert.equal(reuse.status, 400, 'a code works only once');
  });

  test('the reset token is not an access token', async (t) => {
    if (!reachable || !resetToken) return t.skip();
    const r = await call('GET', '/auth/me', undefined, resetToken);
    assert.equal(r.status, 401);
  });

  test('validates the new password', async (t) => {
    if (!reachable || !resetToken) return t.skip();
    const mismatch = await call('POST', '/auth/password/reset', { resetToken, password: NEW_PASSWORD, confirmPassword: 'Different123!' });
    assert.equal(mismatch.status, 400);
    assert.match(mismatch.body.message, /Passwords do not match/);

    const short = await call('POST', '/auth/password/reset', { resetToken, password: 'short', confirmPassword: 'short' });
    assert.equal(short.status, 400);
    assert.match(JSON.stringify(short.body.message), /at least 8 characters/);

    const same = await call('POST', '/auth/password/reset', { resetToken, password: OLD_PASSWORD, confirmPassword: OLD_PASSWORD });
    assert.equal(same.status, 400);
    assert.match(same.body.message, /different from your current password/);

    const forged = await call('POST', '/auth/password/reset', { resetToken: 'not-a-token', password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    assert.equal(forged.status, 400);
    assert.match(forged.body.message, /reset session has expired/);
  });

  test('an access token cannot be used as a reset token', async (t) => {
    if (!reachable) return t.skip();
    const session = await login(OLD_PASSWORD);
    assert.equal(session.status, 200);
    const r = await call('POST', '/auth/password/reset', { resetToken: session.body.accessToken, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    assert.equal(r.status, 400);
  });

  test('resets the password, signs out every session, and the token cannot be reused', async (t) => {
    if (!reachable || !resetToken) return t.skip();
    const session = await login(OLD_PASSWORD);
    assert.equal(session.status, 200);

    const r = await call('POST', '/auth/password/reset', { resetToken, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.success, true);

    const refreshed = await call('POST', '/auth/refresh', { refreshToken: session.body.refreshToken });
    assert.equal(refreshed.status, 401, 'old refresh token revoked');
    assert.equal((await login(OLD_PASSWORD)).status, 401, 'old password no longer works');
    assert.equal((await login(NEW_PASSWORD)).status, 200, 'new password works');

    const reuse = await call('POST', '/auth/password/reset', { resetToken, password: 'Another789!', confirmPassword: 'Another789!' });
    assert.equal(reuse.status, 400, 'reset token is single-use');

    const audit = await prisma.auditLog.count({ where: { entityId: userId, action: 'PASSWORD_RESET' } });
    assert.equal(audit, 1);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    assert.ok(user.emailVerifiedAt, 'email marked verified by the reset code');
  });
});

describe('forgot password — SMS flow', () => {
  test('locks the code after 5 wrong attempts', async (t) => {
    if (!reachable || smsIsReal || !config.otp.channels.includes('SMS')) return t.skip();
    const sent = await call('POST', '/auth/password/forgot', { channel: 'SMS', phone: LOCAL, captchaToken: CAPTCHA });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.channel, 'SMS');
    await setKnownCode(E164, '135790');
    for (let i = 0; i < 5; i++) {
      await call('POST', '/auth/password/verify-code', { channel: 'SMS', phone: LOCAL, code: '000000' });
    }
    const r = await call('POST', '/auth/password/verify-code', { channel: 'SMS', phone: LOCAL, code: '135790' });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /Too many incorrect attempts/);
  });

  test('a fresh code sent to the phone (any format) verifies and resets', async (t) => {
    if (!reachable || smsIsReal || !config.otp.channels.includes('SMS')) return t.skip();
    await backdateCodes(E164);
    const sent = await call('POST', '/auth/password/forgot', { channel: 'SMS', phone: `+88${LOCAL}`, captchaToken: CAPTCHA });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    await setKnownCode(E164, '975310');
    const ok = await call('POST', '/auth/password/verify-code', { channel: 'SMS', phone: LOCAL, code: '975310' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const r = await call('POST', '/auth/password/reset', { resetToken: ok.body.resetToken, password: 'SmsPassword789!', confirmPassword: 'SmsPassword789!' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await login('SmsPassword789!')).status, 200);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    assert.ok(user.phoneVerifiedAt, 'phone marked verified by the reset code');
  });
});
