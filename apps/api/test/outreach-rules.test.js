// Unit tests for the admin bulk-message helpers (apps/api/src/outreach/message-template.ts) and the
// bulk email renderer. Runs against the compiled output: `npm run build && npm test`.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PLACEHOLDERS,
  unknownPlaceholders,
  renderPlaceholders,
  smsSegments,
  checkAddress,
} = require('../dist/outreach/message-template');
const { renderBulkEmail } = require('../dist/outreach/bulk-email');

const values = { name: 'Rahima Akter', challenge: 'Clean Water Challenge', irn: 'IRN-2026-000123' };

test('supported placeholders are name, challenge and irn', () => {
  assert.deepEqual([...PLACEHOLDERS], ['name', 'challenge', 'irn']);
});

test('renders placeholders case-insensitively, with spaces inside the braces', () => {
  assert.equal(
    renderPlaceholders('Dear {{name}}, re {{ Challenge }} ({{IRN}}).', values),
    'Dear Rahima Akter, re Clean Water Challenge (IRN-2026-000123).',
  );
});

test('repeats and Bangla text around placeholders are fine', () => {
  assert.equal(renderPlaceholders('প্রিয় {{name}}, {{name}}!', values), 'প্রিয় Rahima Akter, Rahima Akter!');
});

test('flags unknown placeholders once each, lower-cased; ignores single braces', () => {
  assert.deepEqual(unknownPlaceholders('Hi {{name}} {{Phone}} {{phone}} {{date}} {not} {{ }}'), ['phone', 'date']);
  assert.deepEqual(unknownPlaceholders('Hi {{name}} from {{challenge}}'), []);
});

test('unknown placeholders are left as typed when rendering', () => {
  assert.equal(renderPlaceholders('Hi {{nickname}}', values), 'Hi {{nickname}}');
});

test('SMS segments: GSM-7 160/153, extension chars count double', () => {
  assert.deepEqual(smsSegments('a'.repeat(160)), { encoding: 'GSM-7', units: 160, segments: 1 });
  assert.equal(smsSegments('a'.repeat(161)).segments, 2);
  assert.equal(smsSegments('a'.repeat(306)).segments, 2);
  assert.equal(smsSegments('a'.repeat(307)).segments, 3);
  assert.equal(smsSegments('{}').units, 4);
});

test('SMS segments: any Bangla character switches to UCS-2 70/67', () => {
  assert.deepEqual(smsSegments('ক'.repeat(70)), { encoding: 'UCS-2', units: 70, segments: 1 });
  assert.equal(smsSegments('ক'.repeat(71)).segments, 2);
  assert.equal(smsSegments('Hello ক').encoding, 'UCS-2');
});

test('email addresses are trimmed, lower-cased and validated', () => {
  assert.deepEqual(checkAddress('EMAIL', '  Someone@Example.COM '), { ok: true, address: 'someone@example.com' });
  assert.equal(checkAddress('EMAIL', 'not-an-email').ok, false);
  assert.equal(checkAddress('EMAIL', 'a@b').ok, false);
  assert.deepEqual(checkAddress('EMAIL', ''), { ok: false, address: '', reason: 'No email address on file' });
});

test('mobile numbers are normalized to E.164 or rejected with a reason', () => {
  assert.deepEqual(checkAddress('SMS', '01712-345678'), { ok: true, address: '+8801712345678' });
  assert.deepEqual(checkAddress('SMS', '8801812345678'), { ok: true, address: '+8801812345678' });
  assert.equal(checkAddress('SMS', '+14155550100').ok, false);
  assert.equal(checkAddress('SMS', '01212345678').ok, false);
  assert.deepEqual(checkAddress('SMS', null), { ok: false, address: '', reason: 'No mobile number on file' });
});

test('bulk email: escapes the admin text, keeps paragraphs, localizes the footer', () => {
  const en = renderBulkEmail({ subject: 'Results <soon>', body: 'Line 1\nLine 2\n\nPara 2 & more', locale: 'en', challengeTitle: 'Water' });
  assert.match(en.html, /Results &lt;soon&gt;/);
  assert.match(en.html, /Line 1<br>Line 2<\/p>/);
  assert.match(en.html, /Para 2 &amp; more/);
  assert.match(en.html, /submitted to the “Water” challenge/);
  assert.ok(!en.html.includes('<soon>'));
  assert.equal(en.attachments[0].cid, 'nir-logo@nir');
  assert.match(en.text, /Para 2 & more/);

  const bn = renderBulkEmail({ subject: 'ফলাফল', body: 'প্রিয় অংশগ্রহণকারী', locale: 'bn', challengeTitle: 'পানি' });
  assert.match(bn.html, /lang="bn"/);
  assert.match(bn.html, /“পানি” চ্যালেঞ্জে অংশ নিয়েছেন/);
});
