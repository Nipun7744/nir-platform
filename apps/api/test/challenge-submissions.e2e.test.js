// End-to-end tests for admin-controlled general submission + challenge-based submission, run
// against a live API and the local dev database (seeded demo accounts, password Password123!).
// Everything the test creates is removed again at the end, and the general-submission switch is
// restored to its original value.
//
// Run (API must be running):  npm run test:e2e   (from apps/api)
// Override the target with NIR_API_URL (default http://localhost:4000/api/v1).
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const API = process.env.NIR_API_URL ?? 'http://localhost:4000/api/v1';
const PASSWORD = process.env.NIR_TEST_PASSWORD ?? 'Password123!';
const prisma = new PrismaClient();

async function call(method, path, { token, body, form } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(form ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: res.status, body: json };
}

async function login(email) {
  // Login is CAPTCHA-protected. The default is Cloudflare Turnstile's dummy token, which the
  // Turnstile *test* secret accepts (and which is ignored when CAPTCHA_PROVIDER=none).
  const captchaToken = process.env.NIR_CAPTCHA_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX';
  const r = await call('POST', '/auth/login', { body: { email, password: PASSWORD, captchaToken } });
  assert.ok(r.status < 300, `login ${email}: ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

let reachable = true;
let admin, innovator, originalGeneral, categoryId, challenge;
const slug = `e2e-test-challenge-${Date.now()}`;
const createdInnovationIds = [];

before(async () => {
  try {
    await fetch(`${API}/settings/submission`);
  } catch {
    reachable = false;
    return;
  }
  admin = await login('admin@nir.gov.bd');
  innovator = await login('innovator1@nir.gov.bd');
  originalGeneral = (await call('GET', '/settings/submission')).body.generalSubmissionEnabled;
  categoryId = (await prisma.category.findFirst({ where: { isActive: true }, select: { id: true } })).id;
});

after(async () => {
  if (reachable && admin) {
    await call('PATCH', '/settings/submission', { token: admin, body: { generalSubmissionEnabled: originalGeneral } });
    if (createdInnovationIds.length) {
      await prisma.innovation.deleteMany({ where: { id: { in: createdInnovationIds } } });
      await prisma.auditLog.deleteMany({ where: { entityId: { in: createdInnovationIds } } });
    }
    if (challenge) {
      await prisma.challenge.deleteMany({ where: { id: challenge.id } });
      await prisma.auditLog.deleteMany({ where: { entityId: challenge.id } });
    }
  }
  await prisma.$disconnect();
});

const skip = () => !reachable && 'API not reachable';

describe('general submission switch', () => {
  test('is public and admin-only to change', { skip: skip() }, async () => {
    assert.equal((await call('PATCH', '/settings/submission', { body: { generalSubmissionEnabled: false } })).status, 401);
    assert.equal(
      (await call('PATCH', '/settings/submission', { token: innovator, body: { generalSubmissionEnabled: false } })).status,
      403,
    );
  });

  test('closed switch blocks POST /innovations and draft submit for non-admins', { skip: skip() }, async () => {
    // A draft created while open...
    await call('PATCH', '/settings/submission', { token: admin, body: { generalSubmissionEnabled: true } });
    const draft = await call('POST', '/innovations', {
      token: innovator,
      body: {
        titleEn: 'E2E general draft',
        summaryEn: 's',
        problemStatement: 'p',
        proposedSolution: 'q',
        innovationType: 'PRODUCT',
        categoryId,
      },
    });
    assert.equal(draft.status, 201, JSON.stringify(draft.body));
    createdInnovationIds.push(draft.body.id);
    assert.equal(draft.body.submissionChannel, 'GENERAL');

    // ...cannot be sent, and nothing new can be created, once the admin closes it.
    const off = await call('PATCH', '/settings/submission', { token: admin, body: { generalSubmissionEnabled: false } });
    assert.equal(off.body.generalSubmissionEnabled, false);
    assert.equal((await call('GET', '/settings/submission')).body.generalSubmissionEnabled, false);

    const blockedCreate = await call('POST', '/innovations', {
      token: innovator,
      body: { titleEn: 'x', summaryEn: 's', problemStatement: 'p', proposedSolution: 'q', innovationType: 'PRODUCT', categoryId },
    });
    assert.equal(blockedCreate.status, 403);
    assert.match(blockedCreate.body.message, /currently closed/);
    assert.equal((await call('POST', `/innovations/${draft.body.id}/submit`, { token: innovator })).status, 403);

    // Re-opening restores normal behaviour.
    await call('PATCH', '/settings/submission', { token: admin, body: { generalSubmissionEnabled: true } });
    const sent = await call('POST', `/innovations/${draft.body.id}/submit`, { token: innovator });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.reviewStatus, 'UNDER_REVIEW');
  });
});

describe('challenge-based submission', () => {
  test('admin creates an unpublished challenge, builds its form', { skip: skip() }, async () => {
    const created = await call('POST', '/challenges', {
      token: admin,
      body: {
        slug,
        titleEn: 'E2E Smart Agriculture Challenge',
        organizingAgency: 'E2E',
        descriptionEn: 'd',
        status: 'OPEN',
        isPublished: false,
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    challenge = created.body;

    // Enabling submissions without a category is refused (category routes reviewers).
    assert.equal((await call('PATCH', `/challenges/${challenge.id}`, { token: admin, body: { submissionsEnabled: true } })).status, 400);

    // Non-admins can't touch the form; bad definitions are rejected with readable errors.
    assert.equal((await call('PUT', `/challenges/${challenge.id}/form`, { token: innovator, body: { fields: [] } })).status, 403);
    const bad = await call('PUT', `/challenges/${challenge.id}/form`, {
      token: admin,
      body: { fields: [{ label: 'Sector', type: 'SELECT', options: [] }] },
    });
    assert.equal(bad.status, 400);

    const saved = await call('PUT', `/challenges/${challenge.id}/form`, {
      token: admin,
      body: {
        fields: [
          { label: 'Idea title', type: 'SHORT_TEXT', required: true, mapsTo: 'TITLE' },
          { label: 'Summary', type: 'LONG_TEXT', required: true, mapsTo: 'SUMMARY' },
          { label: 'Contact email', type: 'EMAIL', required: true },
          { label: 'Crop', type: 'SELECT', options: ['Rice', 'Jute'], required: true },
          { label: 'Concept note', type: 'FILE', acceptedFileTypes: ['.pdf'], maxFileSizeMb: 5 },
        ],
      },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.formFields.length, 5);
    assert.deepEqual(saved.body.formFields.map((f) => f.key), ['idea_title', 'summary', 'contact_email', 'crop', 'concept_note']);
  });

  test('unpublished challenge is hidden from the public but previewable by admin', { skip: skip() }, async () => {
    assert.equal((await call('GET', `/challenges/${slug}`)).status, 404);
    assert.ok(!(await call('GET', '/challenges')).body.some((c) => c.slug === slug));
    const preview = await call('GET', `/challenges/${slug}/form`, { token: admin });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.challenge.acceptingSubmissions, false);
  });

  test('only active + published + enabled challenges accept submissions', { skip: skip() }, async () => {
    const answers = { idea_title: 'Drone rice monitoring', summary: 'Monitor paddies', contact_email: 'x@y.bd', crop: 'Rice' };
    // Published but submissions disabled -> 403
    await call('PATCH', `/challenges/${challenge.id}`, { token: admin, body: { isPublished: true, categoryId } });
    let r = await call('POST', `/challenges/${slug}/submissions`, { token: innovator, body: { responses: answers } });
    assert.equal(r.status, 403);
    assert.match(r.body.message, /not enabled/);

    await call('PATCH', `/challenges/${challenge.id}`, { token: admin, body: { submissionsEnabled: true, isActive: false } });
    r = await call('POST', `/challenges/${slug}/submissions`, { token: innovator, body: { responses: answers } });
    assert.equal(r.status, 403);
    assert.match(r.body.message, /inactive/);

    await call('PATCH', `/challenges/${challenge.id}`, { token: admin, body: { isActive: true } });
    const pub = await call('GET', `/challenges/${slug}`);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.acceptingSubmissions, true);
  });

  test('anonymous submissions are refused', { skip: skip() }, async () => {
    const r = await call('POST', `/challenges/${slug}/submissions`, { body: { responses: {} } });
    assert.equal(r.status, 401);
  });

  test('server-side validation follows the form configuration', { skip: skip() }, async () => {
    const r = await call('POST', `/challenges/${slug}/submissions`, {
      token: innovator,
      body: { responses: { idea_title: '', contact_email: 'nope', crop: 'Wheat', concept_note: { url: '/uploads/does-not-exist-123.pdf' } } },
    });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys(r.body.fieldErrors).sort(), ['concept_note', 'contact_email', 'crop', 'idea_title', 'summary']);
  });

  test('valid submission enters primary review linked to the challenge and user', { skip: skip() }, async () => {
    // Upload a real PDF through the normal upload endpoint, then reference it.
    const form = new FormData();
    form.append('file', new Blob(['%PDF-1.4\n%e2e\n'], { type: 'application/pdf' }), 'concept.pdf');
    const up = await call('POST', '/uploads', { token: innovator, form });
    assert.equal(up.status, 201, JSON.stringify(up.body));

    const r = await call('POST', `/challenges/${slug}/submissions`, {
      token: innovator,
      body: {
        responses: {
          idea_title: 'Drone rice monitoring',
          summary: 'Monitor paddies from the air',
          contact_email: 'x@y.bd',
          crop: 'Rice',
          concept_note: { url: up.body.url, name: 'concept.pdf', mimeType: 'application/pdf' },
        },
      },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    createdInnovationIds.push(r.body.id);
    assert.equal(r.body.reviewStatus, 'UNDER_REVIEW');
    assert.equal(r.body.challenge.slug, slug);

    const row = await prisma.innovation.findUnique({ where: { id: r.body.id }, include: { attachments: true } });
    const user = await prisma.user.findUnique({ where: { email: 'innovator1@nir.gov.bd' } });
    assert.equal(row.submissionChannel, 'CHALLENGE');
    assert.equal(row.challengeId, challenge.id);
    assert.equal(row.submittedById, user.id);
    assert.equal(row.categoryId, categoryId);
    assert.equal(row.titleEn, 'Drone rice monitoring');
    assert.equal(row.attachments.length, 1);
    assert.equal(row.challengeResponses.find((e) => e.key === 'crop').value, 'Rice');

    // It is in the existing Primary (preliminary) review queue for admins...
    const queue = await call('GET', '/innovations/preliminary-review-queue', { token: admin });
    assert.ok(queue.body.some((i) => i.id === r.body.id));
    // ...and the existing status workflow still applies to it.
    const fwd = await call('PATCH', `/innovations/${r.body.id}/status`, { token: admin, body: { reviewStatus: 'AUTHENTICITY_REVIEW' } });
    assert.equal(fwd.status, 200, JSON.stringify(fwd.body));
  });

  test('form edits do not alter past submissions', { skip: skip() }, async () => {
    const id = createdInnovationIds[createdInnovationIds.length - 1];
    await call('PUT', `/challenges/${challenge.id}/form`, {
      token: admin,
      body: { fields: [{ label: 'Totally new question', type: 'LONG_TEXT', required: true }] },
    });
    const row = await prisma.innovation.findUnique({ where: { id } });
    assert.deepEqual(row.challengeResponses.map((e) => e.label), ['Idea title', 'Summary', 'Contact email', 'Crop', 'Concept note']);
  });

  test('responses are visible to the submitter and reviewers, not the public', { skip: skip() }, async () => {
    const id = createdInnovationIds[createdInnovationIds.length - 1];
    const own = await call('GET', `/innovations/${id}`, { token: innovator });
    assert.ok(Array.isArray(own.body.challengeResponses));
    assert.equal(own.body.challenge.slug, slug);
    // Publish it temporarily to check the anonymous view.
    await prisma.innovation.update({ where: { id }, data: { reviewStatus: 'PUBLISHED' } });
    const anon = await call('GET', `/innovations/${id}`);
    assert.equal(anon.status, 200);
    assert.equal(anon.body.challengeResponses, null);
  });

  test('admin monitoring filters by channel, challenge, user and status', { skip: skip() }, async () => {
    const byChallenge = await call('GET', `/submissions?challengeId=${challenge.id}`, { token: admin });
    assert.equal(byChallenge.status, 200);
    assert.equal(byChallenge.body.total, 1);
    assert.equal(byChallenge.body.items[0].submittedBy.email, 'innovator1@nir.gov.bd');

    const general = await call('GET', `/submissions?channel=GENERAL&q=innovator1`, { token: admin });
    assert.ok(general.body.items.every((i) => i.submissionChannel === 'GENERAL'));
    assert.ok(general.body.items.some((i) => i.id === createdInnovationIds[0]));

    const none = await call('GET', `/submissions?challengeId=${challenge.id}&reviewStatus=REJECTED`, { token: admin });
    assert.equal(none.body.total, 0);
    assert.equal((await call('GET', '/submissions', { token: innovator })).status, 403);
  });

  test('a challenge with submissions cannot be deleted', { skip: skip() }, async () => {
    const r = await call('DELETE', `/challenges/${challenge.id}`, { token: admin });
    assert.equal(r.status, 409);
  });
});

describe('conditional form fields (2026-11-17)', () => {
  test('admin configures conditions; the server enforces only the chosen option\'s fields', { skip: skip() }, async () => {
    const bad = await call('PUT', `/challenges/${challenge.id}/form`, {
      token: admin,
      body: { fields: [{ label: 'Details', type: 'SHORT_TEXT', showIfFieldIndex: 1, showIfValues: ['A'] }, { label: 'Track', type: 'RADIO', options: ['A'] }] },
    });
    assert.equal(bad.status, 400);
    assert.match(JSON.stringify(bad.body.message), /field above it/);

    const saved = await call('PUT', `/challenges/${challenge.id}/form`, {
      token: admin,
      body: {
        fields: [
          { label: 'Idea title', type: 'SHORT_TEXT', required: true, mapsTo: 'TITLE' },
          { label: 'Applicant type', type: 'SELECT', required: true, options: ['Individual', 'Organisation'] },
          { label: 'National ID', type: 'SHORT_TEXT', required: true, showIfFieldIndex: 1, showIfValues: ['Individual'] },
          { label: 'Organisation name', type: 'SHORT_TEXT', required: true, showIfFieldIndex: 1, showIfValues: ['Organisation'] },
        ],
      },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const form = (await call('GET', `/challenges/${slug}/form`)).body.fields;
    assert.deepEqual(form.map((f) => [f.key, f.showIfFieldKey, f.showIfValues]), [
      ['idea_title', null, []],
      ['applicant_type', null, []],
      ['national_id', 'applicant_type', ['Individual']],
      ['organisation_name', 'applicant_type', ['Organisation']],
    ]);

    // Organisation chosen: its field is required, the Individual-only field is not.
    const missing = await call('POST', `/challenges/${slug}/submissions`, {
      token: innovator,
      body: { responses: { idea_title: 'Cond test', applicant_type: 'Organisation' } },
    });
    assert.equal(missing.status, 400);
    assert.deepEqual(Object.keys(missing.body.fieldErrors), ['organisation_name']);

    const ok = await call('POST', `/challenges/${slug}/submissions`, {
      token: innovator,
      body: { responses: { idea_title: 'Cond test', applicant_type: 'Organisation', organisation_name: 'a2i', national_id: 'stale' } },
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    createdInnovationIds.push(ok.body.id);
    const row = await prisma.innovation.findUnique({ where: { id: ok.body.id } });
    assert.deepEqual(row.challengeResponses.map((e) => e.key), ['idea_title', 'applicant_type', 'organisation_name']);
  });
});
