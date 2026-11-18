// End-to-end tests for the admin "Participants & messaging" feature (GET/POST /admin/outreach/*):
// participant listing + .xlsx export, bulk email/SMS preview, admin OTP confirmation, guarded send,
// background delivery, history and audit trail. Runs against a live API + the local dev DB, which
// must be in console mail/SMS mode (the sends would otherwise really go out):
//
//   MAIL_TRANSPORT=console SMS_PROVIDER=console  (in the API's environment), then
//   MAIL_TRANSPORT=console SMS_PROVIDER=console npm run test:e2e
//
// Creates a throwaway challenge, 5 users and their innovations directly in the DB and deletes all
// of it afterwards. Takes ~75 s: it waits once for the 5-sends-per-minute throttle to reset.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const argon2 = require('argon2');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');

const API = process.env.NIR_API_URL ?? 'http://localhost:4000/api/v1';
const CAPTCHA = process.env.NIR_CAPTCHA_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX';
const ADMIN_EMAIL = 'admin@nir.gov.bd';
const PASSWORD = 'Password123!';
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
const unquote = (v) => String(v ?? '').trim().replace(/^["']|["']$/g, '');
const deliveryIsReal =
  process.env.NIR_E2E_REAL_DELIVERY !== '1' &&
  (!['', 'console'].includes(unquote(env.MAIL_TRANSPORT)) || !['', 'console'].includes(unquote(env.SMS_PROVIDER)));

async function call(method, p, { token, body, raw } = {}) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: res.status, body: json };
}

async function login(email) {
  const r = await call('POST', '/auth/login', { body: { email, password: PASSWORD, captchaToken: CAPTCHA } });
  assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = Date.now();
const created = { userIds: [], innovationIds: [], challengeId: null };
let admin, submitterToken, categoryId, adminTarget;
let reachable = true;

async function setKnownAdminCode(code) {
  const otp = await prisma.otpCode.findFirst({
    where: { target: adminTarget, purpose: 'BULK_MESSAGE_CONFIRM', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(otp, 'no BULK_MESSAGE_CONFIRM code for the admin');
  await prisma.otpCode.update({ where: { id: otp.id }, data: { codeHash: hmac(adminTarget, code) } });
}
/** Skip the 60 s per-target resend cooldown between the admin's code requests. */
const backdateAdminCodes = () =>
  prisma.otpCode.updateMany({ where: { target: adminTarget, purpose: 'BULK_MESSAGE_CONFIRM' }, data: { createdAt: new Date(Date.now() - 61_000) } });

async function waitForJob(id, timeoutMs = 40_000) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const r = await call('GET', `/admin/outreach/messages/${id}`, { token: admin });
    assert.equal(r.status, 200);
    if (!['QUEUED', 'SENDING'].includes(r.body.message.status)) return r.body;
    if (Date.now() > until) throw new Error(`job ${id} still ${r.body.message.status}`);
    await sleep(500);
  }
}

async function makeUser(n, data) {
  const passwordHash = await argon2.hash(PASSWORD);
  const user = await prisma.user.create({
    data: {
      email: `outreach-e2e-${stamp}-${n}@example.com`,
      passwordHash,
      fullName: `Outreach E2E ${n}`,
      roles: ['INNOVATION_SUBMITTER'],
      isActive: true,
      innovatorProfile: { create: { irn: `IRN-E2E-${stamp}-${n}` } },
      ...data,
    },
  });
  created.userIds.push(user.id);
  return user;
}

async function makeInnovation(user, n, extra = {}) {
  const inv = await prisma.innovation.create({
    data: {
      innovationCode: `E2E-OUT-${stamp}-${n}`,
      slug: `e2e-outreach-${stamp}-${n}`,
      titleEn: `Outreach innovation ${n}`,
      titleBn: `আউটরিচ উদ্ভাবন ${n}`,
      summaryEn: 'Throwaway innovation for the outreach e2e test.',
      problemStatement: 'Test problem',
      proposedSolution: 'Test solution',
      innovationType: 'PRODUCT',
      categoryId,
      submittedById: user.id,
      submissionChannel: 'CHALLENGE',
      challengeId: created.challengeId,
      reviewStatus: 'UNDER_REVIEW',
      submittedAt: new Date(Date.now() - (10 - n) * 60_000),
      ...extra,
    },
  });
  created.innovationIds.push(inv.id);
  return inv;
}

let u1, u2, u3, u4, u5;

before(async () => {
  try {
    await fetch(`${API}/auth/security-config`);
  } catch {
    reachable = false;
    return;
  }
  if (deliveryIsReal) return;
  categoryId = (await prisma.category.findFirstOrThrow({ select: { id: true } })).id;
  const challenge = await prisma.challenge.create({
    data: {
      slug: `e2e-outreach-${stamp}`,
      titleEn: `E2E Outreach Challenge ${stamp}`,
      titleBn: `ই২ই আউটরিচ চ্যালেঞ্জ ${stamp}`,
      organizingAgency: 'a2i',
      descriptionEn: 'Throwaway challenge for the outreach e2e test.',
      isPublished: false,
    },
  });
  created.challengeId = challenge.id;

  // u1: en, valid email + phone, TWO submissions (must appear once).
  u1 = await makeUser(1, { phone: '+8801899123401', locale: 'en' });
  // u2: Bangla, valid email, no phone.
  u2 = await makeUser(2, { locale: 'bn', fullName: 'রহিমা আক্তার' });
  // u3: invalid email and invalid phone (legacy data).
  u3 = await makeUser(3, { phone: '12345' });
  await prisma.user.update({ where: { id: u3.id }, data: { email: `broken-${stamp}@@example` } });
  // u4: inactive account.
  u4 = await makeUser(4, { isActive: false, rejectedAt: new Date() });
  // u5: only a DRAFT — not a participant.
  u5 = await makeUser(5, {});

  await makeInnovation(u1, 1);
  await makeInnovation(u1, 2);
  await makeInnovation(u2, 3);
  await makeInnovation(u3, 4);
  await makeInnovation(u4, 5);
  await makeInnovation(u5, 6, { reviewStatus: 'DRAFT', submittedAt: null });

  admin = await login(ADMIN_EMAIL);
  submitterToken = await login(u1.email);
  adminTarget = ADMIN_EMAIL.toLowerCase();
});

after(async () => {
  if (reachable && created.challengeId) {
    const jobs = await prisma.bulkMessage.findMany({ where: { challengeId: created.challengeId }, select: { id: true } });
    const ids = [created.challengeId, ...jobs.map((j) => j.id), ...created.userIds];
    await prisma.bulkMessage.deleteMany({ where: { id: { in: jobs.map((j) => j.id) } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ entityId: { in: ids } }, { actorId: { in: created.userIds } }] } });
    await prisma.auditLog.deleteMany({ where: { action: 'BULK_MESSAGE_OTP_SENT', createdAt: { gte: new Date(stamp) } } });
    await prisma.innovation.deleteMany({ where: { id: { in: created.innovationIds } } });
    await prisma.challenge.deleteMany({ where: { id: created.challengeId } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.otpCode.deleteMany({ where: { target: adminTarget ?? ADMIN_EMAIL, purpose: 'BULK_MESSAGE_CONFIRM' } });
  }
  await prisma.$disconnect();
});

const skip = () => !reachable || deliveryIsReal;
const compose = (over = {}) => ({
  challengeId: created.challengeId,
  channel: 'EMAIL',
  subject: 'Update for {{challenge}}',
  body: `Dear {{name}},\n\nThanks for your submission ({{irn}}). Run ${stamp}.`,
  ...over,
});

describe('access control', () => {
  test('non-admins get 403 on every outreach route', { skip: skip() }, async () => {
    for (const [method, p] of [
      ['GET', '/admin/outreach/challenges'],
      ['GET', `/admin/outreach/challenges/${created.challengeId}/participants/export`],
      ['POST', '/admin/outreach/messages/otp'],
      ['GET', '/admin/outreach/messages'],
    ]) {
      assert.equal((await call(method, p, { token: submitterToken, body: method === 'POST' ? {} : undefined })).status, 403, p);
    }
    assert.equal((await call('GET', '/admin/outreach/challenges')).status, 401);
  });
});

describe('participants', () => {
  test('challenge list counts unique, non-draft participants', { skip: skip() }, async () => {
    const r = await call('GET', '/admin/outreach/challenges', { token: admin });
    assert.equal(r.status, 200);
    const mine = r.body.find((c) => c.id === created.challengeId);
    assert.equal(mine.participantCount, 4);
  });

  test('list de-duplicates a participant with two submissions and supports search', { skip: skip() }, async () => {
    const r = await call('GET', `/admin/outreach/challenges/${created.challengeId}/participants`, { token: admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.totalParticipants, 4);
    assert.equal(r.body.totalSubmissions, 5);
    assert.equal(r.body.items.filter((p) => p.userId === u1.id).length, 1);
    assert.equal(r.body.items.find((p) => p.userId === u1.id).submissionCount, 2);
    assert.ok(!r.body.items.some((p) => p.userId === u5.id), 'draft-only user excluded');
    const s = await call('GET', `/admin/outreach/challenges/${created.challengeId}/participants?q=${encodeURIComponent('রহিমা')}`, { token: admin });
    assert.deepEqual(s.body.items.map((p) => p.userId), [u2.id]);
  });

  test('exports a well-formed .xlsx (headers, dedupe, Bangla, text phone) and audits it', { skip: skip() }, async () => {
    const res = await call('GET', `/admin/outreach/challenges/${created.challengeId}/participants/export`, { token: admin, raw: true });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /spreadsheetml\.sheet/);
    assert.match(res.headers.get('content-disposition'), /attachment; filename="nir-participants-e2e-outreach-\d+-\d{4}-\d{2}-\d{2}\.xlsx"/);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await res.arrayBuffer()));
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['Participants', 'Submissions', 'Export info']);

    const ps = wb.getWorksheet('Participants');
    assert.deepEqual(ps.getRow(1).values.slice(1, 6), ['SL', 'Full name', 'Email', 'Mobile', 'Innovator ID (IRN)']);
    assert.equal(ps.rowCount, 5, 'header + 4 unique participants');
    const rows = [];
    ps.eachRow((row, i) => i > 1 && rows.push(row));
    const r1 = rows.find((row) => row.getCell(3).value === u1.email);
    assert.equal(r1.getCell(4).value, '+8801899123401', 'phone kept as text');
    assert.equal(r1.getCell(13).value, 2, 'submission count');
    assert.match(String(r1.getCell(14).value), new RegExp(`E2E-OUT-${stamp}-1\\nE2E-OUT-${stamp}-2`));
    assert.ok(r1.getCell(12).value instanceof Date, 'dates are real Excel dates');
    assert.ok(rows.some((row) => row.getCell(2).value === 'রহিমা আক্তার'), 'Bangla name intact');

    const ss = wb.getWorksheet('Submissions');
    assert.equal(ss.rowCount, 6, 'header + 5 non-draft submissions');
    assert.equal(ss.getRow(2).getCell(4).value, 'আউটরিচ উদ্ভাবন 1');

    const bn = await call('GET', `/admin/outreach/challenges/${created.challengeId}/participants/export?lang=bn`, { token: admin, raw: true });
    const wbBn = new ExcelJS.Workbook();
    await wbBn.xlsx.load(Buffer.from(await bn.arrayBuffer()));
    assert.equal(wbBn.worksheets[0].name, 'অংশগ্রহণকারী');
    assert.equal(wbBn.worksheets[0].getRow(1).getCell(2).value, 'পূর্ণ নাম');

    const audits = await prisma.auditLog.count({ where: { action: 'CHALLENGE_PARTICIPANTS_EXPORTED', entityId: created.challengeId } });
    assert.equal(audits, 2);
  });
});

describe('bulk messages', () => {
  let emailJobId;
  const requestKey = randomUUID();

  test('preview counts deliverable vs skipped recipients and renders placeholders', { skip: skip() }, async () => {
    const r = await call('POST', '/admin/outreach/messages/preview', { token: admin, body: compose() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.totalParticipants, 4);
    assert.equal(r.body.recipientCount, 2, 'u1 + u2');
    assert.deepEqual(r.body.skipped.map((s) => s.reason).sort(), ['Account inactive', 'Invalid email address']);
    assert.match(r.body.sample.body, /^Dear Outreach E2E 1,\n\nThanks for your submission \(IRN-E2E-\d+-1\)/);
    assert.equal(r.body.sample.subject, `Update for E2E Outreach Challenge ${stamp}`);
    assert.equal(r.body.duplicateOf, null);

    const sms = await call('POST', '/admin/outreach/messages/preview', { token: admin, body: compose({ channel: 'SMS', subject: undefined, body: 'Hi {{name}}' }) });
    assert.equal(sms.status, 200, JSON.stringify(sms.body));
    assert.equal(sms.body.recipientCount, 1, 'only u1 has a valid mobile');
    assert.ok(sms.body.skipped.some((s) => s.reason === 'No mobile number on file'));
    assert.ok(sms.body.skipped.some((s) => s.reason === 'Invalid Bangladeshi mobile number'));
    assert.deepEqual(sms.body.sample.sms, { encoding: 'GSM-7', units: 17, segments: 1 });
  });

  test('preview rejects unknown placeholders, a missing subject and an over-long SMS', { skip: skip() }, async () => {
    const bad = await call('POST', '/admin/outreach/messages/preview', { token: admin, body: compose({ body: 'Hi {{nickname}}' }) });
    assert.equal(bad.status, 400);
    assert.match(bad.body.message, /Unknown placeholder: \{\{nickname\}\}/);
    assert.equal((await call('POST', '/admin/outreach/messages/preview', { token: admin, body: compose({ subject: '' }) })).status, 400);
    const long = await call('POST', '/admin/outreach/messages/preview', { token: admin, body: compose({ channel: 'SMS', body: 'x'.repeat(481) }) });
    assert.equal(long.status, 400);
  });

  test('sending needs the admin\'s own confirmation code', { skip: skip() }, async () => {
    const otp = await call('POST', '/admin/outreach/messages/otp', { token: admin, body: { otpChannel: 'EMAIL', locale: 'en' } });
    assert.equal(otp.status, 200, JSON.stringify(otp.body));
    assert.equal(otp.body.channel, 'EMAIL');
    assert.ok(!otp.body.sentTo.includes('admin@'), 'masked');
    await setKnownAdminCode('135791');

    const wrong = await call('POST', '/admin/outreach/messages', { token: admin, body: { ...compose(), otpChannel: 'EMAIL', otpCode: '000000', requestKey } });
    assert.equal(wrong.status, 400);
    assert.match(wrong.body.message, /Incorrect verification code/);
    assert.equal(await prisma.bulkMessage.count({ where: { challengeId: created.challengeId } }), 0, 'nothing queued');
  });

  test('a confirmed send is queued once, delivered in the background, and a replay returns the same job', { skip: skip() }, async () => {
    const r = await call('POST', '/admin/outreach/messages', { token: admin, body: { ...compose(), otpChannel: 'EMAIL', otpCode: '135791', requestKey } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.replayed, false);
    assert.equal(r.body.totalRecipients, 4);
    assert.equal(r.body.skippedCount, 2);
    emailJobId = r.body.id;

    // Double-click / retry with the same request key: same job, no second send (and no code needed).
    const replay = await call('POST', '/admin/outreach/messages', { token: admin, body: { ...compose(), otpChannel: 'EMAIL', otpCode: '999999', requestKey } });
    assert.equal(replay.status, 201);
    assert.equal(replay.body.id, emailJobId);
    assert.equal(replay.body.replayed, true);

    const done = await waitForJob(emailJobId);
    assert.equal(done.message.status, 'COMPLETED');
    assert.equal(done.message.sentCount, 2);
    assert.equal(done.message.failedCount, 0);
    const byName = Object.fromEntries(done.recipients.items.map((x) => [x.name, x]));
    assert.equal(byName['Outreach E2E 1'].status, 'SENT');
    assert.equal(byName['রহিমা আক্তার'].status, 'SENT');
    assert.equal(byName['Outreach E2E 3'].status, 'SKIPPED');
    assert.equal(byName['Outreach E2E 4'].error, 'Account inactive');
    assert.equal(done.recipients.items[0].status, 'SKIPPED', 'skipped/failed listed first');
  });

  test('the same message again within 24 h is refused unless explicitly allowed, without burning the code', { skip: skip() }, async () => {
    await backdateAdminCodes();
    assert.equal((await call('POST', '/admin/outreach/messages/otp', { token: admin, body: {} })).status, 200);
    await setKnownAdminCode('246802');
    const preview = await call('POST', '/admin/outreach/messages/preview', { token: admin, body: compose() });
    assert.equal(preview.body.duplicateOf.id, emailJobId, 'preview warns');

    const again = await call('POST', '/admin/outreach/messages', { token: admin, body: { ...compose(), otpChannel: 'EMAIL', otpCode: '246802', requestKey: randomUUID() } });
    assert.equal(again.status, 409);
    assert.equal(again.body.duplicateOf.id, emailJobId);

    const allowed = await call('POST', '/admin/outreach/messages', {
      token: admin,
      body: { ...compose(), otpChannel: 'EMAIL', otpCode: '246802', requestKey: randomUUID(), allowRepeat: true },
    });
    assert.equal(allowed.status, 201, JSON.stringify(allowed.body));
    await waitForJob(allowed.body.id);
  });

  test('bulk SMS goes only to valid mobiles', { skip: skip(), timeout: 120_000 }, async () => {
    // The send endpoint allows 5 requests/min per IP; the tests above used 5.
    await sleep(61_000);
    await backdateAdminCodes();
    assert.equal((await call('POST', '/admin/outreach/messages/otp', { token: admin, body: { otpChannel: 'EMAIL' } })).status, 200);
    await setKnownAdminCode('112233');
    const body = { challengeId: created.challengeId, channel: 'SMS', body: 'NIR: {{name}}, results for {{challenge}} are out.', otpChannel: 'EMAIL', otpCode: '112233', requestKey: randomUUID() };
    const r = await call('POST', '/admin/outreach/messages', { token: admin, body });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const done = await waitForJob(r.body.id);
    assert.equal(done.message.status, 'COMPLETED');
    assert.equal(done.message.sentCount, 1);
    assert.equal(done.message.skippedCount, 3);
  });

  test('history lists the sends with sender and counts; every step is audit-logged', { skip: skip() }, async () => {
    const h = await call('GET', `/admin/outreach/messages?challengeId=${created.challengeId}`, { token: admin });
    assert.equal(h.status, 200);
    assert.equal(h.body.total, 3);
    assert.deepEqual(h.body.items.map((m) => m.channel), ['SMS', 'EMAIL', 'EMAIL']);
    assert.ok(h.body.items.every((m) => m.createdBy.email === ADMIN_EMAIL && m.status === 'COMPLETED'));

    const actions = (await prisma.auditLog.findMany({
      where: { OR: [{ entityId: { in: h.body.items.map((m) => m.id) } }, { entityId: created.challengeId }] },
      select: { action: true },
    })).map((a) => a.action);
    for (const a of ['BULK_MESSAGE_QUEUED', 'BULK_MESSAGE_FINISHED', 'BULK_MESSAGE_BLOCKED_DUPLICATE', 'CHALLENGE_PARTICIPANTS_EXPORTED']) {
      assert.ok(actions.includes(a), `audit ${a}`);
    }
    assert.ok(await prisma.auditLog.count({ where: { action: 'BULK_MESSAGE_OTP_SENT', createdAt: { gte: new Date(stamp) } } }) >= 3);
  });
});
