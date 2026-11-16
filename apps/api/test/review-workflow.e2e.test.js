// End-to-end tests for the reviewer actions on the review pipeline:
// Preliminary Reviewer longlists (UNDER_REVIEW -> AUTHENTICITY_REVIEW) or rejects, and an
// Authenticity Reviewer shortlists. Covers the 2026-11-12 bug where a user holding BOTH reviewer
// roles got 403 on every action. Runs against a live API + the dev DB. It creates throwaway
// reviewer accounts and innovations directly in the DB and removes them all afterwards.
//
// Run (API must be running):  npm run test:e2e   (from apps/api)
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const API = process.env.NIR_API_URL ?? 'http://localhost:4000/api/v1';
const PASSWORD = 'Password123!';
const CAPTCHA = process.env.NIR_CAPTCHA_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX';
const prisma = new PrismaClient();
const stamp = Date.now();

async function call(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: res.status, body: json };
}

async function login(email) {
  const r = await call('POST', '/auth/login', undefined, { email, password: PASSWORD, captchaToken: CAPTCHA });
  assert.ok(r.status < 300, `login ${email}: ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

let reachable = true;
let inCategory;
let otherCategory;
let submitterId;
const userIds = [];
const innovationIds = [];
const tokens = {};

async function makeReviewer(key, roles, prelimCats, authCats) {
  const user = await prisma.user.create({
    data: {
      email: `review-e2e-${key}-${stamp}@example.com`,
      fullName: `Review E2E ${key}`,
      passwordHash: await argon2.hash(PASSWORD),
      roles,
      isActive: true,
      preliminaryReviewerCategoryIds: prelimCats,
      authenticityReviewerCategoryIds: authCats,
    },
  });
  userIds.push(user.id);
  tokens[key] = await login(user.email);
}

async function makePending(label, categoryId = inCategory) {
  const n = innovationIds.length + 1;
  const inv = await prisma.innovation.create({
    data: {
      innovationCode: `E2E-RVW-${stamp}-${n}`,
      slug: `e2e-review-${stamp}-${n}`,
      titleEn: `E2E review ${label}`,
      summaryEn: 'Throwaway innovation for the review-workflow e2e test.',
      problemStatement: 'Test problem',
      proposedSolution: 'Test solution',
      innovationType: 'PRODUCT',
      categoryId,
      submittedById: submitterId,
      reviewStatus: 'UNDER_REVIEW',
      submittedAt: new Date(),
    },
  });
  innovationIds.push(inv.id);
  return inv.id;
}

const setStatus = (who, id, reviewStatus, note) =>
  call('PATCH', `/innovations/${id}/status`, tokens[who], { reviewStatus, note });

before(async () => {
  try {
    await fetch(`${API}/auth/security-config`);
  } catch {
    reachable = false;
    return;
  }
  const cats = await prisma.category.findMany({ where: { isActive: true }, select: { id: true }, take: 2 });
  [inCategory, otherCategory] = cats.map((c) => c.id);
  submitterId = (await prisma.user.findFirstOrThrow({ where: { email: 'innovator1@nir.gov.bd' }, select: { id: true } })).id;
  await makeReviewer('prelim', ['PRELIMINARY_REVIEWER'], [inCategory], []);
  await makeReviewer('dual', ['PRELIMINARY_REVIEWER', 'AUTHENTICITY_REVIEWER'], [inCategory], [inCategory]);
  await makeReviewer('evaluator', ['EXPERT_EVALUATOR'], [], []);
});

after(async () => {
  if (innovationIds.length) {
    await prisma.reviewComment.deleteMany({ where: { innovationId: { in: innovationIds } } });
    await prisma.evaluation.deleteMany({ where: { innovationId: { in: innovationIds } } });
    await prisma.innovation.deleteMany({ where: { id: { in: innovationIds } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: innovationIds } } });
  }
  if (userIds.length) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

describe('preliminary reviewer', () => {
  test('longlists a pending submission to authenticity review, keeping the note', async (t) => {
    if (!reachable) return t.skip('API not reachable');
    const id = await makePending('longlist');
    const r = await setStatus('prelim', id, 'AUTHENTICITY_REVIEW', 'Looks complete');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.reviewStatus, 'AUTHENTICITY_REVIEW');
    const comments = await prisma.reviewComment.findMany({ where: { innovationId: id } });
    assert.deepEqual(comments.map((c) => [c.stage, c.note]), [['PRELIMINARY_REVIEW', 'Looks complete']]);
    // It moves from the Pending tab to the Reviewed tab.
    const reviewed = await call('GET', '/innovations/preliminary-review-queue?reviewStatus=REVIEWED', tokens.prelim);
    assert.ok(reviewed.body.some((i) => i.id === id));
  });

  test('rejects a pending submission; it lands in the Rejected tab attributed to this stage', async (t) => {
    if (!reachable) return t.skip('API not reachable');
    const id = await makePending('reject');
    const r = await setStatus('prelim', id, 'REJECTED', 'Out of scope');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.reviewStatus, 'REJECTED');
    assert.equal(r.body.rejectedAtStage, 'PRELIMINARY_REVIEW');
    const rejected = await call('GET', '/innovations/preliminary-review-queue?reviewStatus=REJECTED', tokens.prelim);
    assert.ok(rejected.body.some((i) => i.id === id));
  });

  test('cannot skip ahead, act outside their categories, or act on another stage, and gets a readable reason', async (t) => {
    if (!reachable) return t.skip('API not reachable');
    const id = await makePending('guards');
    const skipAhead = await setStatus('prelim', id, 'SHORTLISTED');
    assert.equal(skipAhead.status, 403);
    assert.match(skipAhead.body.message, /only longlist/);

    if (otherCategory) {
      const foreign = await makePending('foreign', otherCategory);
      const r = await setStatus('prelim', foreign, 'AUTHENTICITY_REVIEW');
      assert.equal(r.status, 403);
      assert.match(r.body.message, /outside your assigned review categories/);
    }

    assert.equal((await setStatus('prelim', id, 'AUTHENTICITY_REVIEW')).status, 200);
    const again = await setStatus('prelim', id, 'REJECTED');
    assert.equal(again.status, 403, 'already forwarded: no longer a preliminary-review item');
    assert.match(again.body.message, /not at a review stage you can act on/);
  });
});

describe('user holding both reviewer roles (regression)', () => {
  test('can longlist at preliminary review, then shortlist at authenticity review', async (t) => {
    if (!reachable) return t.skip('API not reachable');
    const id = await makePending('dual');
    const longlist = await setStatus('dual', id, 'AUTHENTICITY_REVIEW', 'Prelim OK');
    assert.equal(longlist.status, 200, JSON.stringify(longlist.body));
    const shortlist = await setStatus('dual', id, 'SHORTLISTED', 'Authentic');
    assert.equal(shortlist.status, 200, JSON.stringify(shortlist.body));
    const stages = (
      await prisma.reviewComment.findMany({ where: { innovationId: id }, orderBy: { createdAt: 'asc' } })
    ).map((c) => c.stage);
    assert.deepEqual(stages, ['PRELIMINARY_REVIEW', 'AUTHENTICITY_REVIEW'], 'each note is filed under the stage it was made at');
  });

  test('can reject at preliminary review', async (t) => {
    if (!reachable) return t.skip('API not reachable');
    const id = await makePending('dual-reject');
    const r = await setStatus('dual', id, 'REJECTED');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.rejectedAtStage, 'PRELIMINARY_REVIEW');
  });
});

describe('expert evaluation stage guard (regression, 2026-11-16)', () => {
  const evaluate = (id) =>
    call('POST', '/evaluations', tokens.evaluator, { innovationId: id, scores: { Innovativeness: 7 }, recommendation: 'SHORTLIST' });

  test('refuses an evaluation before authenticity review, then accepts it once SHORTLISTED', async (t) => {
    if (!reachable) return t.skip('API not reachable');
    const id = await makePending('eval-guard');
    const early = await evaluate(id);
    assert.equal(early.status, 400, JSON.stringify(early.body));
    assert.equal(await prisma.evaluation.count({ where: { innovationId: id } }), 0, 'nothing saved');

    assert.equal((await setStatus('dual', id, 'AUTHENTICITY_REVIEW')).status, 200);
    assert.equal((await evaluate(id)).status, 400, 'still refused during authenticity review');
    assert.equal((await setStatus('dual', id, 'SHORTLISTED')).status, 200);

    const ok = await evaluate(id);
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const inv = await prisma.innovation.findUnique({ where: { id }, select: { reviewStatus: true } });
    assert.equal(inv.reviewStatus, 'SELECTED');
  });

  test('unknown innovation gives 404', async (t) => {
    if (!reachable) return t.skip('API not reachable');
    const r = await call('POST', '/evaluations', tokens.evaluator, { innovationId: 'does-not-exist', scores: { Innovativeness: 7 }, recommendation: 'SHORTLIST' });
    assert.equal(r.status, 404);
  });
});
