// Unit tests for src/challenges/challenge-rules.ts (run against the compiled dist output).
// Run: npm run build && npm test   (from apps/api)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  submissionState,
  normalizeFormDefinition,
  validateResponses,
  mappedValue,
} = require('../dist/challenges/challenge-rules');

const OPEN = {
  status: 'OPEN',
  isPublished: true,
  isActive: true,
  submissionsEnabled: true,
  categoryId: 'cat1',
  startDate: null,
  deadline: null,
  formFieldCount: 3,
};

describe('submissionState', () => {
  test('accepts when published, active, enabled, OPEN, configured', () => {
    assert.deepEqual(submissionState(OPEN), { acceptingSubmissions: true, closedReason: null });
  });

  for (const [patch, reason] of [
    [{ isPublished: false }, /not published/],
    [{ isActive: false }, /inactive/],
    [{ submissionsEnabled: false }, /not enabled/],
    [{ status: 'UPCOMING' }, /not opened yet/],
    [{ status: 'CLOSED' }, /no longer accepting/],
    [{ categoryId: null }, /not yet configured/],
    [{ formFieldCount: 0 }, /not yet configured/],
  ]) {
    test(`rejects when ${JSON.stringify(patch)}`, () => {
      const s = submissionState({ ...OPEN, ...patch });
      assert.equal(s.acceptingSubmissions, false);
      assert.match(s.closedReason, reason);
    });
  }

  test('deadline is inclusive of the whole day (UTC)', () => {
    const c = { ...OPEN, deadline: '2026-11-10T00:00:00.000Z' };
    assert.equal(submissionState(c, new Date('2026-11-10T22:00:00Z')).acceptingSubmissions, true);
    assert.match(submissionState(c, new Date('2026-11-11T00:00:01Z')).closedReason, /deadline has passed/);
  });

  test('not open before startDate', () => {
    const c = { ...OPEN, startDate: '2026-12-01T00:00:00.000Z' };
    assert.match(submissionState(c, new Date('2026-11-10T00:00:00Z')).closedReason, /not opened yet/);
  });
});

describe('normalizeFormDefinition', () => {
  test('generates stable keys, de-duplicates auto keys, assigns order', () => {
    const { fields, errors } = normalizeFormDefinition([
      { label: 'Project Name', type: 'SHORT_TEXT', mapsTo: 'TITLE', required: true },
      { label: 'Project name', type: 'LONG_TEXT' },
      { label: '2nd attempt', type: 'NUMBER' },
    ]);
    assert.deepEqual(errors, []);
    assert.deepEqual(fields.map((f) => f.key), ['project_name', 'project_name_2', 'field_2nd_attempt']);
    assert.deepEqual(fields.map((f) => f.sortOrder), [0, 1, 2]);
    assert.equal(fields[0].mapsTo, 'TITLE');
  });

  test('keeps explicit keys and rejects explicit duplicates', () => {
    const { errors } = normalizeFormDefinition([
      { key: 'name', label: 'A', type: 'SHORT_TEXT' },
      { key: 'name', label: 'B', type: 'SHORT_TEXT' },
    ]);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /used by another field/);
  });

  test('choice fields need options (except a consent checkbox)', () => {
    const { errors } = normalizeFormDefinition([
      { label: 'Sector', type: 'SELECT', options: [] },
      { label: 'Agree', type: 'CHECKBOX', options: [] },
      { label: 'Size', type: 'RADIO', options: ['S', 'S'] },
    ]);
    assert.equal(errors.length, 2);
    assert.match(errors[0], /at least one option/);
    assert.match(errors[1], /unique/);
  });

  test('file restrictions are validated and normalized', () => {
    const ok = normalizeFormDefinition([
      { label: 'Deck', type: 'MULTI_FILE', acceptedFileTypes: ['PDF', '.pptx', 'pdf'], maxFileSizeMb: 10, maxFiles: 3 },
    ]);
    assert.deepEqual(ok.errors, []);
    assert.deepEqual(ok.fields[0].acceptedFileTypes, ['.pdf', '.pptx']);
    const bad = normalizeFormDefinition([{ label: 'Bin', type: 'FILE', acceptedFileTypes: ['.exe'], maxFileSizeMb: 500 }]);
    assert.equal(bad.errors.length, 2);
  });

  test('mapping only on text fields, at most once each', () => {
    const { errors } = normalizeFormDefinition([
      { label: 'A', type: 'SHORT_TEXT', mapsTo: 'TITLE' },
      { label: 'B', type: 'SHORT_TEXT', mapsTo: 'TITLE' },
      { label: 'C', type: 'NUMBER', mapsTo: 'SUMMARY' },
    ]);
    assert.equal(errors.length, 2);
  });

  test('unknown type and missing label are reported', () => {
    const { errors } = normalizeFormDefinition([{ label: '', type: 'SHORT_TEXT' }, { label: 'X', type: 'MAGIC' }]);
    assert.equal(errors.length, 2);
  });
});

describe('validateResponses', () => {
  const def = (o) => ({
    id: o.key,
    required: false,
    options: [],
    acceptedFileTypes: [],
    maxFileSizeMb: null,
    maxFiles: null,
    mapsTo: null,
    ...o,
    label: o.label ?? o.key,
  });
  const files = { '/uploads/aaaaaaaa-1111.pdf': 1024, '/uploads/bbbbbbbb-2222.png': 6 * 1024 * 1024 };
  const lookup = (url) => (url in files ? { sizeBytes: files[url] } : null);

  const fields = [
    def({ key: 'title', type: 'SHORT_TEXT', required: true, mapsTo: 'TITLE' }),
    def({ key: 'summary', type: 'LONG_TEXT' }),
    def({ key: 'budget', type: 'NUMBER' }),
    def({ key: 'email', type: 'EMAIL', required: true }),
    def({ key: 'phone', type: 'PHONE' }),
    def({ key: 'sector', type: 'SELECT', options: ['Agri', 'Health'] }),
    def({ key: 'size', type: 'RADIO', options: ['S', 'M'] }),
    def({ key: 'needs', type: 'CHECKBOX', options: ['Fund', 'Mentor', 'Space'] }),
    def({ key: 'agree', type: 'CHECKBOX', required: true }),
    def({ key: 'start', type: 'DATE' }),
    def({ key: 'proposal', type: 'FILE', acceptedFileTypes: ['.pdf'], maxFileSizeMb: 2 }),
    def({ key: 'photos', type: 'MULTI_FILE', maxFiles: 2, maxFileSizeMb: 5 }),
  ];

  test('valid responses are normalized into a snapshot', () => {
    const { errors, entries } = validateResponses(
      fields,
      {
        title: '  Smart irrigation ',
        budget: '1500',
        email: 'a@b.co',
        phone: '+880 1711-000000',
        sector: 'Agri',
        size: 'M',
        needs: ['Space', 'Fund', 'Fund'],
        agree: true,
        start: '2026-02-28',
        proposal: { url: '/uploads/aaaaaaaa-1111.pdf', name: 'proposal.pdf', mimeType: 'application/pdf', sizeBytes: 1 },
        unknownKey: 'dropped',
      },
      lookup,
    );
    assert.deepEqual(errors, {});
    const byKey = Object.fromEntries(entries.map((e) => [e.key, e]));
    assert.equal(byKey.title.value, 'Smart irrigation');
    assert.equal(byKey.budget.value, 1500);
    assert.deepEqual(byKey.needs.value, ['Fund', 'Space']);
    assert.equal(byKey.agree.value, true);
    assert.equal(byKey.proposal.files[0].sizeBytes, 1024, 'size comes from disk, not the client');
    assert.equal(byKey.summary.value, null);
    assert.ok(!('unknownKey' in byKey));
    assert.equal(byKey.title.label, 'title', 'label is snapshotted');
    assert.equal(mappedValue(entries, fields, 'TITLE'), 'Smart irrigation');
  });

  test('every rule violation is reported per field', () => {
    const { errors } = validateResponses(
      fields,
      {
        title: '',
        budget: 'abc',
        email: 'not-an-email',
        phone: 'call me',
        sector: 'Space',
        size: 'XL',
        needs: ['Nope'],
        agree: false,
        start: '2026-02-30',
        proposal: { url: '/uploads/bbbbbbbb-2222.png', name: 'x.png' },
        photos: [{ url: '/uploads/aaaaaaaa-1111.pdf' }, { url: '/uploads/bbbbbbbb-2222.png' }, { url: '/uploads/aaaaaaaa-1111.pdf' }],
      },
      lookup,
    );
    assert.deepEqual(Object.keys(errors).sort(), [
      'agree', 'budget', 'email', 'needs', 'phone', 'photos', 'proposal', 'sector', 'size', 'start', 'title',
    ]);
    assert.match(errors.proposal, /not an accepted file type/);
    assert.match(errors.photos, /at most 2 files/);
  });

  test('file references must be real server uploads within the size limit', () => {
    const f = [def({ key: 'doc', type: 'FILE', maxFileSizeMb: 1 })];
    assert.match(validateResponses(f, { doc: { url: 'https://evil.example/x.pdf' } }, lookup).errors.doc, /Invalid file reference/);
    assert.match(validateResponses(f, { doc: { url: '/uploads/../../etc/passwd' } }, lookup).errors.doc, /Invalid file reference/);
    assert.match(validateResponses(f, { doc: { url: '/uploads/cccccccc-3333.pdf' } }, lookup).errors.doc, /could not be found/);
    assert.match(validateResponses(f, { doc: { url: '/uploads/bbbbbbbb-2222.png' } }, lookup).errors.doc, /larger than 1 MB/);
  });

  test('length limits on text', () => {
    const f = [def({ key: 't', type: 'SHORT_TEXT' })];
    assert.match(validateResponses(f, { t: 'x'.repeat(501) }, lookup).errors.t, /at most 500/);
  });
});
