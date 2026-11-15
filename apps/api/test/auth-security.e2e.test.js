// End-to-end tests for registration OTP + login CAPTCHA, run against a live API and the local dev
// database. Expects the local-dev setup from docs/SETUP.md: CAPTCHA_PROVIDER=turnstile with
// Cloudflare's always-pass *test* keys (CAPTCHA cases are skipped if CAPTCHA_PROVIDER=none).
//
// OTP codes are stored only as an HMAC, so to complete a registration the test overwrites the
// freshly sent code's hash with the HMAC of a known code — computed with the same secret the API
// uses (OTP_SECRET, else JWT_ACCESS_SECRET, read from apps/api/.env). Everything created is removed.
//
// Run (API must be running):  npm run test:e2e   (from apps/api)
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const API = process.env.NIR_API_URL ?? 'http://localhost:4000/api/v1';
const DUMMY_CAPTCHA = process.env.NIR_CAPTCHA_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX';
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

async function call(method, p, body) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: res.status, body: json };
}

/** Make the latest code sent to `target` equal `code`. */
async function setKnownCode(target, code) {
  const otp = await prisma.otpCode.findFirst({ where: { target, consumedAt: null }, orderBy: { createdAt: 'desc' } });
  assert.ok(otp, `no OTP row for ${target}`);
  await prisma.otpCode.update({ where: { id: otp.id }, data: { codeHash: hmac(target, code) } });
}

const stamp = Date.now();
const newEmail = `otp-e2e-${stamp}@example.com`;
const smsEmail = `otp-e2e-sms-${stamp}@example.com`;
// 019 + 8 digits derived from the timestamp — unlikely to collide with a real seeded user.
const local = `019${String(stamp).slice(-8)}`;
const e164 = `+88${local}`;
const PASSWORD = 'Password123!';

// Tests that make the API actually deliver a code only run while that channel is in console
// mode; otherwise they would email/text made-up addresses for real (bounces, SMS credits,
// possibly a stranger's phone). NIR_E2E_REAL_DELIVERY=1 overrides this on purpose.
const unquote = (v) => String(v ?? '').trim().replace(/^["']|["']$/g, '');
const realDeliveryOk = process.env.NIR_E2E_REAL_DELIVERY === '1';
const mailIsReal = !realDeliveryOk && !['', 'console'].includes(unquote(env.MAIL_TRANSPORT));
const smsIsReal = !realDeliveryOk && !['', 'console'].includes(unquote(env.SMS_PROVIDER));

let reachable = true;
let config;

before(async () => {
  try {
    config = (await call('GET', '/auth/security-config')).body;
  } catch {
    reachable = false;
  }
});

after(async () => {
  if (reachable) {
    const users = await prisma.user.findMany({ where: { email: { in: [newEmail, smsEmail] } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.otpCode.deleteMany({ where: { target: { in: [newEmail, e164] } } });
  }
  await prisma.$disconnect();
});

describe('security config', () => {
  test('exposes the CAPTCHA provider/site key and OTP settings, no secrets', (t) => {
    if (!reachable) return t.skip();
    assert.ok(['turnstile', 'recaptcha', 'hcaptcha', 'none'].includes(config.captcha.provider));
    assert.deepEqual(Object.keys(config.captcha).sort(), ['provider', 'siteKey']);
    assert.equal(config.otp.codeLength, 6);
    assert.ok(config.otp.channels.length >= 1);
  });
});

describe('login CAPTCHA', () => {
  const skip = () => !reachable || config.captcha.provider === 'none';

  test('login without a CAPTCHA token is rejected before credentials are checked', async (t) => {
    if (skip()) return t.skip();
    const r = await call('POST', '/auth/login', { email: 'admin@nir.gov.bd', password: PASSWORD });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /CAPTCHA/);
  });

  test('wrong password with a valid CAPTCHA is a normal 401', async (t) => {
    if (!reachable) return t.skip();
    const r = await call('POST', '/auth/login', { email: 'admin@nir.gov.bd', password: 'wrong-password', captchaToken: DUMMY_CAPTCHA });
    assert.equal(r.status, 401);
  });

  test('valid credentials + CAPTCHA token signs in', async (t) => {
    if (!reachable) return t.skip();
    const r = await call('POST', '/auth/login', { email: 'admin@nir.gov.bd', password: PASSWORD, captchaToken: DUMMY_CAPTCHA });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.accessToken);
  });
});

describe('registration OTP — email', () => {
  test('sending a code requires the CAPTCHA', async (t) => {
    if (!reachable || config.captcha.provider === 'none') return t.skip();
    const r = await call('POST', '/auth/otp/send', { channel: 'EMAIL', email: newEmail });
    assert.equal(r.status, 400);
  });

  test('refuses an email that already has an account', async (t) => {
    if (!reachable) return t.skip();
    const r = await call('POST', '/auth/otp/send', { channel: 'EMAIL', email: 'admin@nir.gov.bd', captchaToken: DUMMY_CAPTCHA });
    assert.equal(r.status, 409);
  });

  test('register without a code is a validation error', async (t) => {
    if (!reachable) return t.skip();
    const r = await call('POST', '/auth/register', { email: newEmail, password: PASSWORD, fullName: 'OTP Test' });
    assert.equal(r.status, 400);
  });

  test('sends a code, enforces the resend cooldown, rejects a wrong code, accepts the right one once', async (t) => {
    if (!reachable) return t.skip();
    if (mailIsReal) return t.skip('MAIL_TRANSPORT is real; set it to console (or NIR_E2E_REAL_DELIVERY=1)');
    const sent = await call('POST', '/auth/otp/send', { channel: 'EMAIL', email: newEmail, captchaToken: DUMMY_CAPTCHA });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.channel, 'EMAIL');
    assert.ok(!sent.body.sentTo.includes(newEmail.split('@')[0]), 'address is masked');

    const again = await call('POST', '/auth/otp/send', { channel: 'EMAIL', email: newEmail, captchaToken: DUMMY_CAPTCHA });
    assert.equal(again.status, 429);

    await setKnownCode(newEmail, '246810');
    const base = { email: newEmail, password: PASSWORD, fullName: 'OTP Test', otpChannel: 'EMAIL' };

    const wrong = await call('POST', '/auth/register', { ...base, otpCode: '000000' });
    assert.equal(wrong.status, 400);
    assert.match(wrong.body.message, /4 attempts left/);

    const ok = await call('POST', '/auth/register', { ...base, otpCode: '246810' });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    // Verified OTP = approved + active, and the response signs the user in.
    assert.equal(ok.body.pending, false);
    assert.ok(ok.body.accessToken && ok.body.refreshToken, 'returns a session');
    assert.equal(ok.body.user.email, newEmail);

    const user = await prisma.user.findUnique({ where: { email: newEmail } });
    assert.ok(user.emailVerifiedAt, 'emailVerifiedAt is set');
    assert.equal(user.phoneVerifiedAt, null);
    assert.equal(user.isActive, true, 'activated on OTP verification');

    const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${ok.body.accessToken}` } });
    assert.equal(me.status, 200, 'the returned token works');

    const reused = await call('POST', '/auth/register', { ...base, email: `x${newEmail}`, otpCode: '246810' });
    assert.equal(reused.status, 400, 'a code is bound to its address');
  });
});

describe('registration OTP — SMS', () => {
  const skip = () => !reachable || !config.otp.channels.includes('SMS');

  test('rejects a non-Bangladeshi number', async (t) => {
    if (skip()) return t.skip();
    const r = await call('POST', '/auth/otp/send', { channel: 'SMS', phone: '+14155550100', captchaToken: DUMMY_CAPTCHA });
    assert.equal(r.status, 400);
  });

  test('locks the code after 5 wrong attempts', async (t) => {
    if (skip()) return t.skip();
    if (smsIsReal) return t.skip('SMS_PROVIDER is real; set it to console (or NIR_E2E_REAL_DELIVERY=1)');
    const sent = await call('POST', '/auth/otp/send', { channel: 'SMS', phone: local, locale: 'bn', captchaToken: DUMMY_CAPTCHA });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    await setKnownCode(e164, '135791');
    const base = { email: smsEmail, phone: local, password: PASSWORD, fullName: 'OTP SMS Test', otpChannel: 'SMS' };
    for (let i = 0; i < 5; i++) {
      const r = await call('POST', '/auth/register', { ...base, otpCode: '000000' });
      assert.equal(r.status, 400);
    }
    const locked = await call('POST', '/auth/register', { ...base, otpCode: '135791' });
    assert.equal(locked.status, 400);
    assert.match(locked.body.message, /Too many incorrect attempts/);
  });

  test('a fresh code verifies the phone, which is stored normalized', async (t) => {
    if (skip()) return t.skip();
    if (smsIsReal) return t.skip('SMS_PROVIDER is real; set it to console (or NIR_E2E_REAL_DELIVERY=1)');
    // Skip the 60s resend cooldown by back-dating the previous code.
    await prisma.otpCode.updateMany({ where: { target: e164 }, data: { createdAt: new Date(Date.now() - 120_000) } });
    const sent = await call('POST', '/auth/otp/send', { channel: 'SMS', phone: `+88 ${local}`, captchaToken: DUMMY_CAPTCHA });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    await setKnownCode(e164, '864202');
    const r = await call('POST', '/auth/register', {
      email: smsEmail, phone: local, password: PASSWORD, fullName: 'OTP SMS Test', otpChannel: 'SMS', otpCode: '864202',
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const user = await prisma.user.findUnique({ where: { email: smsEmail } });
    assert.equal(user.phone, e164);
    assert.ok(user.phoneVerifiedAt);
    assert.equal(user.emailVerifiedAt, null);

    const dup = await call('POST', '/auth/otp/send', { channel: 'SMS', phone: local, captchaToken: DUMMY_CAPTCHA });
    assert.equal(dup.status, 409, 'phone now taken');
  });
});
