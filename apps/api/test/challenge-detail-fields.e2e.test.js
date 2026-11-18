// End-to-end tests for configurable challenge details fields (2026-11-18): an admin creates a
// challenge with its own field list, edits / reorders / retypes fields, the API rejects fields that
// break their rules, and the public read returns only filled fields without the admin-only
// set-up. Runs against a live API + the local dev DB; creates one unpublished challenge and
// deletes it afterwards.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const API = process.env.NIR_API_URL ?? 'http://localhost:4000/api/v1';
const CAPTCHA = process.env.NIR_CAPTCHA_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX';
const ADMIN_EMAIL = 'admin@nir.gov.bd';
const PASSWORD = 'Password123!';

async function call(method, p, { token, body } = {}) {
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

const slug = `e2e-details-${Date.now().toString(36)}`;
let admin, id, reachable = true;

const FIELDS = [
  {
    key: 'objective', labelEn: 'Objective', labelBn: 'উদ্দেশ্য', type: 'LONG_TEXT',
    placeholderEn: 'Background', helpTextEn: 'Shown to admins only', validation: { required: true, minLength: 10 },
    value: 'Make public services faster.', valueBn: 'সরকারি সেবা দ্রুত করা।',
  },
  {
    sectionEn: 'At a glance', sectionBn: 'এক নজরে', labelEn: 'Focus sectors', labelBn: 'খাত', type: 'CHECKBOX',
    options: [{ en: 'Health', bn: 'স্বাস্থ্য' }, { en: 'Education', bn: 'শিক্ষা' }], validation: { min: 1, max: 2 }, value: ['Health'],
  },
  { sectionEn: 'At a glance', labelEn: 'Team size', type: 'NUMBER', validation: { min: 1, max: 10 }, value: '5' },
  { labelEn: 'Rules document', type: 'FILE', value: '/uploads/rules.pdf' },
  { labelEn: 'Empty for now', type: 'SHORT_TEXT', placeholderEn: 'later' },
];

before(async () => {
  try {
    const r = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: PASSWORD, captchaToken: CAPTCHA } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    admin = r.body.accessToken;
  } catch (e) {
    reachable = false;
    console.warn(`API not reachable at ${API} — skipping (${e.message})`);
  }
});

after(async () => {
  if (id) await call('DELETE', `/challenges/${id}`, { token: admin });
});

describe('challenge details fields', () => {
  test('create stores the normalized list (keys generated, extras dropped)', { skip: !reachable && 'API down' }, async () => {
    const r = await call('POST', '/challenges', {
      token: admin,
      body: { slug, titleEn: 'E2E details', organizingAgency: 'a2i', descriptionEn: 'desc', isPublished: false, detailFields: FIELDS.map((f) => ({ ...f, junk: 1 })) },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    id = r.body.id;
    const keys = r.body.detailFields.map((f) => f.key);
    assert.deepEqual(keys, ['objective', 'focus_sectors', 'team_size', 'rules_document', 'empty_for_now']);
    assert.ok(r.body.detailFields.every((f) => !('junk' in f)));
    assert.equal(r.body.detailFields[0].helpTextEn, 'Shown to admins only');
  });

  test('the admin list returns the full set-up for editing', { skip: !reachable && 'API down' }, async () => {
    const r = await call('GET', '/challenges/admin', { token: admin });
    const c = r.body.find((x) => x.id === id);
    assert.equal(c.detailFields.length, 5);
    assert.deepEqual(c.detailFields[0].validation, { required: true, minLength: 10 });
  });

  test('public read: only filled fields, without placeholder / help text / rules', { skip: !reachable && 'API down' }, async () => {
    const r = await call('GET', `/challenges/${slug}`, { token: admin }); // unpublished → admin preview
    assert.equal(r.status, 200);
    const keys = r.body.detailFields.map((f) => f.key);
    assert.deepEqual(keys, ['objective', 'focus_sectors', 'team_size', 'rules_document']);
    for (const f of r.body.detailFields) {
      for (const k of ['placeholderEn', 'helpTextEn', 'validation']) assert.ok(!(k in f), `${f.key}.${k} leaked`);
    }
    assert.deepEqual(r.body.detailFields[1].options, [{ en: 'Health', bn: 'স্বাস্থ্য' }, { en: 'Education', bn: 'শিক্ষা' }]);
  });

  test('values that break their rules are rejected with a clear 400, nothing saved', { skip: !reachable && 'API down' }, async () => {
    const cases = [
      [{ ...FIELDS[0], value: '' }, /"Objective" is required/],
      [{ ...FIELDS[0], value: 'short' }, /at least 10 characters/],
      [{ ...FIELDS[1], value: ['Health', 'Sports'] }, /"Sports" is no longer one of the options/],
      [{ ...FIELDS[2], value: '50' }, /must be at most 10/],
      [{ ...FIELDS[3], value: 'javascript:alert(1)' }, /upload a file or paste/],
      [{ labelEn: 'Bad', type: 'SELECT', options: [] }, /at least one option/],
      [{ labelEn: 'Bad', type: 'SHORT_TEXT', validation: { pattern: '(' } }, /not a valid regular expression/],
    ];
    for (const [field, re] of cases) {
      const r = await call('PATCH', `/challenges/${id}`, { token: admin, body: { detailFields: [field] } });
      assert.equal(r.status, 400, JSON.stringify(field));
      assert.match(String(r.body.message), re);
    }
    const after = await call('GET', '/challenges/admin', { token: admin });
    assert.equal(after.body.find((x) => x.id === id).detailFields.length, 5, 'unchanged after rejected saves');
    const notArray = await call('PATCH', `/challenges/${id}`, { token: admin, body: { detailFields: 'nope' } });
    assert.equal(notArray.status, 400);
  });

  test('admins can reorder, retype, relabel and remove fields; keys stay stable', { skip: !reachable && 'API down' }, async () => {
    const current = (await call('GET', '/challenges/admin', { token: admin })).body.find((x) => x.id === id).detailFields;
    const [objective, sectors, team, , empty] = current;
    const next = [
      { ...team, type: 'SELECT', options: [{ en: 'Solo' }, { en: 'Team' }], value: 'Team', validation: undefined },
      { ...objective, labelEn: 'Goal', labelBn: 'লক্ষ্য' },
      sectors,
      empty,
    ];
    const r = await call('PATCH', `/challenges/${id}`, { token: admin, body: { detailFields: next } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.detailFields.map((f) => f.key), ['team_size', 'objective', 'focus_sectors', 'empty_for_now']);
    assert.equal(r.body.detailFields[0].type, 'SELECT');
    assert.equal(r.body.detailFields[1].labelEn, 'Goal');

    // A PATCH without detailFields leaves them alone.
    const r2 = await call('PATCH', `/challenges/${id}`, { token: admin, body: { titleEn: 'E2E details (renamed)' } });
    assert.equal(r2.body.detailFields.length, 4);
  });

  test('contact fields: saved without sections, validated, public read shows filled ones only', { skip: !reachable && 'API down' }, async () => {
    const contactFields = [
      { labelEn: 'WhatsApp', labelBn: 'হোয়াটসঅ্যাপ', type: 'PHONE', sectionEn: 'ignored', placeholderEn: '+880…', value: '+880 1700 000000' },
      { labelEn: 'Office hours', type: 'SHORT_TEXT', value: 'Sun–Thu, 9am–5pm', valueBn: 'রবি–বৃহস্পতি, সকাল ৯টা–বিকেল ৫টা' },
      { labelEn: 'Website', type: 'URL' },
    ];
    const r = await call('PATCH', `/challenges/${id}`, { token: admin, body: { contactFields } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.contactFields.map((f) => f.key), ['whatsapp', 'office_hours', 'website']);
    assert.ok(r.body.contactFields.every((f) => !('sectionEn' in f)), 'contact fields have no sections');
    assert.equal(r.body.detailFields.length, 4, 'details fields untouched');

    const pub = await call('GET', `/challenges/${slug}`, { token: admin });
    assert.deepEqual(pub.body.contactFields.map((f) => f.key), ['whatsapp', 'office_hours']);
    assert.ok(!('placeholderEn' in pub.body.contactFields[0]));

    const bad = await call('PATCH', `/challenges/${id}`, { token: admin, body: { contactFields: [{ labelEn: 'Email us', type: 'EMAIL', value: 'nope' }] } });
    assert.equal(bad.status, 400);
    assert.match(String(bad.body.message), /^Contact fields: .*valid email/);
  });

  test('non-admins cannot change a challenge’s fields', { skip: !reachable && 'API down' }, async () => {
    const r = await call('PATCH', `/challenges/${id}`, { body: { detailFields: [] } });
    assert.equal(r.status, 401);
  });
});
