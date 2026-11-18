// Unit tests for the configurable challenge details fields rules (2026-11-18), shared by the API
// and the admin form: packages/shared/src/challenge-detail-fields.ts. Needs the shared package
// built (`npm run build:shared` from the repo root).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeDetailFields,
  validateDetailFields,
  publicDetailFields,
  detailFieldKey,
} = require('@nir/shared');

const check = (fields) => validateDetailFields(normalizeDetailFields(fields));
const messages = (fields) => check(fields).map((i) => i.message).join(' | ');

test('an empty list (a new challenge) is valid', () => {
  assert.deepEqual(check([]), []);
  assert.deepEqual(normalizeDetailFields(null), []);
});

test('normalize trims, generates unique keys and drops settings that do not fit the type', () => {
  const [a, b, c] = normalizeDetailFields([
    { labelEn: '  Who can apply? ', type: 'SHORT_TEXT', value: '  Anyone  ', options: [{ en: 'x' }], validation: { min: 3, minLength: '2' }, extra: 'dropped' },
    { labelEn: 'Who can apply?', type: 'NUMBER', value: 7, valueBn: 'সাত' },
    { labelEn: 'বাংলা শুধু', type: 'CHECKBOX', options: ['A', { en: ' B ', bn: ' বি ' }, ''], value: 'A' },
  ]);
  assert.equal(a.key, 'who_can_apply');
  assert.equal(a.labelEn, 'Who can apply?');
  assert.equal(a.value, 'Anyone');
  assert.equal(a.options, undefined, 'options only for choice types');
  assert.deepEqual(a.validation, { minLength: 2 }, 'min/max only for NUMBER/CHECKBOX');
  assert.equal(a.extra, undefined);
  assert.equal(b.key, 'who_can_apply_2', 'duplicate keys get a suffix');
  assert.equal(b.value, '7');
  assert.equal(b.valueBn, undefined, 'Bangla value only for text types');
  assert.equal(c.key, 'field_3', 'non-Latin label falls back to field_N');
  assert.deepEqual(c.options, [{ en: 'A' }, { en: 'B', bn: 'বি' }]);
  assert.deepEqual(c.value, ['A']);
  assert.equal(detailFieldKey('Prizes & support'), 'prizes_support');
});

test('set-up problems: label, type, options, rule ranges, bad pattern, duplicate label', () => {
  assert.match(messages([{ type: 'SHORT_TEXT' }]), /English label is required/);
  assert.match(messages([{ labelEn: 'X', type: 'COLOR' }]), /choose an input type/);
  assert.match(messages([{ labelEn: 'X', type: 'SELECT', options: [] }]), /at least one option/);
  assert.match(messages([{ labelEn: 'X', type: 'RADIO', options: ['a', 'A'] }]), /listed twice/);
  assert.match(messages([{ labelEn: 'X', type: 'LONG_TEXT', validation: { minLength: 10, maxLength: 5 } }]), /minimum length is larger/);
  assert.match(messages([{ labelEn: 'X', type: 'NUMBER', validation: { min: 9, max: 1 } }]), /minimum is larger/);
  assert.match(messages([{ labelEn: 'X', type: 'SHORT_TEXT', validation: { pattern: '([a-z' } }]), /not a valid regular expression/);
  assert.match(
    messages([{ labelEn: 'Same', type: 'SHORT_TEXT' }, { labelEn: 'same', type: 'LONG_TEXT' }]),
    /already has this label/,
  );
  // …but the same label in different sections is fine.
  assert.deepEqual(check([{ labelEn: 'Same', sectionEn: 'A', type: 'SHORT_TEXT' }, { labelEn: 'Same', sectionEn: 'B', type: 'SHORT_TEXT' }]), []);
  assert.equal(check(Array.from({ length: 51 }, (_, i) => ({ labelEn: `F${i}`, type: 'SHORT_TEXT' }))).length, 1);
});

test('required: English text, or at least one ticked option', () => {
  assert.match(messages([{ labelEn: 'Objective', type: 'LONG_TEXT', validation: { required: true } }]), /Objective" is required/);
  assert.match(messages([{ labelEn: 'Objective', type: 'LONG_TEXT', validation: { required: true }, valueBn: 'শুধু বাংলা' }]), /is required/);
  assert.deepEqual(check([{ labelEn: 'Objective', type: 'LONG_TEXT', validation: { required: true }, value: 'ok' }]), []);
  assert.match(messages([{ labelEn: 'Areas', type: 'CHECKBOX', options: ['a'], validation: { required: true } }]), /tick at least one/);
  // Optional Bangla-only text is allowed (the English site just doesn't show it).
  assert.deepEqual(check([{ labelEn: 'Note', type: 'SHORT_TEXT', valueBn: 'নোট' }]), []);
});

test('length limits apply to the English and the Bangla text separately (by characters)', () => {
  const f = { labelEn: 'Tagline', type: 'SHORT_TEXT', validation: { minLength: 3, maxLength: 5 } };
  assert.deepEqual(check([{ ...f, value: 'abcde', valueBn: 'বাংলা' }]), []);
  assert.match(messages([{ ...f, value: 'abcdef' }]), /English text can be at most 5/);
  assert.match(messages([{ ...f, value: 'abc', valueBn: 'বা' }]), /Bangla text must be at least 3/);
  assert.match(messages([{ labelEn: 'Short', type: 'SHORT_TEXT', value: 'x'.repeat(501) }]), /at most 500/);
});

test('typed values: number range, email, phone, URL, file link, date, choices', () => {
  const ok = (type, value, extra = {}) => assert.deepEqual(check([{ labelEn: 'F', type, value, ...extra }]), [], `${type} ${value}`);
  const bad = (type, value, re, extra = {}) => assert.match(messages([{ labelEn: 'F', type, value, ...extra }]), re, `${type} ${value}`);
  ok('NUMBER', '12.5', { validation: { min: 0, max: 20 } });
  bad('NUMBER', '12abc', /enter a number/);
  bad('NUMBER', '30', /at most 20/, { validation: { max: 20 } });
  bad('NUMBER', '-1', /at least 0/, { validation: { min: 0 } });
  ok('EMAIL', 'team@a2i.gov.bd');
  bad('EMAIL', 'team@', /valid email/);
  ok('PHONE', '+880 2 5500 6931');
  bad('PHONE', 'call me', /valid phone/);
  ok('URL', 'https://a2i.gov.bd/challenge');
  bad('URL', 'javascript:alert(1)', /http/);
  ok('FILE', '/uploads/rules.pdf');
  bad('FILE', 'data:text/html,hi', /upload a file/);
  ok('DATE', '2026-12-31');
  bad('DATE', '2026-02-30', /valid date/);
  ok('SELECT', 'Idea', { options: ['Idea', 'Pilot'] });
  bad('RADIO', 'Other', /no longer one of the options/, { options: ['Idea', 'Pilot'] });
  bad('CHECKBOX', ['a', 'b', 'c'], /at most 2/, { options: ['a', 'b', 'c'], validation: { max: 2 } });
  bad('CHECKBOX', ['a'], /at least 2/, { options: ['a', 'b', 'c'], validation: { min: 2 } });
});

test('pattern rule matches the whole English value and shows the custom message', () => {
  const f = { labelEn: 'Code', type: 'SHORT_TEXT', validation: { pattern: '[A-Z]{3}-\\d+', patternMessageEn: 'Use the form ABC-123.' } };
  assert.deepEqual(check([{ ...f, value: 'NIR-2026' }]), []);
  assert.match(messages([{ ...f, value: 'xNIR-2026' }]), /Use the form ABC-123/);
  assert.match(messages([{ ...f, value: 'NIR-2026 ' + 'x' }]), /Use the form ABC-123/);
});

test('public view keeps only filled fields and drops placeholder / help / rules', () => {
  const pub = publicDetailFields(
    normalizeDetailFields([
      { labelEn: 'Shown', type: 'SHORT_TEXT', value: 'yes', placeholderEn: 'p', helpTextEn: 'h', validation: { required: true } },
      { labelEn: 'Empty', type: 'SHORT_TEXT' },
      { labelEn: 'Areas', type: 'CHECKBOX', options: ['a'], value: [] },
    ]),
  );
  assert.equal(pub.length, 1);
  assert.deepEqual(Object.keys(pub[0]).sort(), ['key', 'labelEn', 'type', 'value']);
});
