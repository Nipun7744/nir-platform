/**
 * One-off production import: create the 31 PUBLISHED innovations exported by
 * `export-prod-sync.ts` (bundle: prod-sync-data.json + prod-sync-assets/) that are not yet in
 * the Railway production DB.
 *
 * Plain CommonJS on purpose: it runs inside the Railway container from railway.json's
 * deploy.startCommand, where devDependencies (ts-node) are not installed. Only needs
 * @prisma/client (a runtime dep, generated during the build step).
 *
 * Idempotent: skips any innovation whose innovationCode already exists, so it is safe to leave
 * wired into startCommand across container restarts — but per docs/SETUP.md it should be removed
 * again once the one-off sync is confirmed.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DATA_FILE = path.join(__dirname, 'prod-sync-data.json');
const ASSETS_DIR = path.join(__dirname, 'prod-sync-assets');
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const FALLBACK_SUBMITTER = 'admin@nir.gov.bd';

async function resolveRegionId(regionId, warn) {
  if (!regionId) return null;
  const r = await prisma.region.findUnique({ where: { id: regionId } });
  if (r) return r.id;
  warn(`region "${regionId}" not found in prod — leaving null`);
  return null;
}

async function resolveOrganizationId(org, warn) {
  if (!org || !org.name) return null;
  const existing = await prisma.organization.findFirst({ where: { name: org.name } });
  if (existing) return existing.id;
  const created = await prisma.organization.create({
    data: {
      name: org.name,
      type: org.type || 'PRIVATE_SECTOR',
      websiteUrl: org.websiteUrl || undefined,
      logoUrl: org.logoUrl || undefined,
      isVerified: !!org.isVerified,
      regionId: await resolveRegionId(org.regionId, warn),
    },
  });
  return created.id;
}

async function uniqueSlug(desired, code) {
  const clash = await prisma.innovation.findUnique({ where: { slug: desired } });
  if (!clash || clash.innovationCode === code) return desired;
  return `${desired}-${code.split('-').pop()}`;
}

function copyAssets(log) {
  if (!fs.existsSync(ASSETS_DIR)) return;
  const files = fs.readdirSync(ASSETS_DIR);
  if (!files.length) return;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  let n = 0;
  for (const f of files) {
    const dest = path.join(UPLOAD_DIR, f);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(ASSETS_DIR, f), dest);
      n++;
    }
  }
  log(`assets: ${n} file(s) copied to ${UPLOAD_DIR} (${files.length} in bundle)`);
}

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log(`[prod-sync] no ${path.basename(DATA_FILE)} present — nothing to do`);
    return;
  }
  const { innovations } = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  console.log(`[prod-sync] bundle has ${innovations.length} innovations`);

  const fallback = await prisma.user.findUnique({ where: { email: FALLBACK_SUBMITTER } });
  const summary = { created: 0, skipped: 0, errors: [] };

  for (const it of innovations) {
    const tag = `[prod-sync] ${it.innovationCode}`;
    const warn = (m) => console.warn(`${tag}: WARN ${m}`);
    try {
      const exists = await prisma.innovation.findUnique({ where: { innovationCode: it.innovationCode } });
      if (exists) {
        summary.skipped++;
        console.log(`${tag}: already present — skip`);
        continue;
      }

      const category = await prisma.category.findUnique({ where: { slug: it.categorySlug } });
      if (!category) throw new Error(`category slug "${it.categorySlug}" not found`);

      let submitter = null;
      if (it.submitterEmail) submitter = await prisma.user.findUnique({ where: { email: it.submitterEmail } });
      submitter = submitter || fallback;
      if (!submitter) throw new Error(`no submitter (email "${it.submitterEmail}" and fallback "${FALLBACK_SUBMITTER}" both missing)`);

      const regionId = await resolveRegionId(it.regionId, warn);
      const organizationId = await resolveOrganizationId(it.organization, warn);

      const tagConnects = [];
      for (const t of it.tags || []) {
        const row = await prisma.tag.upsert({
          where: { type_nameEn: { type: t.type, nameEn: t.nameEn } },
          update: {},
          create: { type: t.type, nameEn: t.nameEn, nameBn: t.nameBn || t.nameEn },
        });
        tagConnects.push({ tagId: row.id });
      }

      const sdgConnects = [];
      for (const code of it.sdgCodes || []) {
        const row = await prisma.sdgTag.findUnique({ where: { code } });
        if (row) sdgConnects.push({ sdgTagId: row.id });
        else warn(`SDG code ${code} not found — skipped`);
      }

      const slug = await uniqueSlug(it.slug, it.innovationCode);
      if (slug !== it.slug) warn(`slug "${it.slug}" taken — using "${slug}"`);

      await prisma.innovation.create({
        data: {
          innovationCode: it.innovationCode,
          slug,
          titleEn: it.titleEn,
          titleBn: it.titleBn,
          summaryEn: it.summaryEn,
          summaryBn: it.summaryBn,
          problemStatement: it.problemStatement,
          proposedSolution: it.proposedSolution,
          objectives: it.objectives,
          keyFeatures: it.keyFeatures,
          targetBeneficiaries: it.targetBeneficiaries,
          impact: it.impact,
          technologyReadinessLevel: it.technologyReadinessLevel ?? undefined,
          innovationType: it.innovationType,
          developmentStage: it.developmentStage ?? undefined,
          ipStatus: it.ipStatus ?? undefined,
          fundingSource: it.fundingSource ?? undefined,
          commercializationStatus: it.commercializationStatus,
          replicationPotential: it.replicationPotential,
          mentorshipNeeded: !!it.mentorshipNeeded,
          fundingNeeded: !!it.fundingNeeded,
          recognitionNeeded: !!it.recognitionNeeded,
          latitude: it.latitude ?? undefined,
          longitude: it.longitude ?? undefined,
          pipelineStage: it.pipelineStage ?? undefined,
          isFeatured: !!it.isFeatured,
          languageOriginal: it.languageOriginal ?? undefined,
          reviewStatus: it.reviewStatus,
          submittedAt: it.submittedAt ? new Date(it.submittedAt) : undefined,
          publishedAt: it.publishedAt ? new Date(it.publishedAt) : undefined,
          categoryId: category.id,
          regionId: regionId ?? undefined,
          organizationId: organizationId ?? undefined,
          submittedById: submitter.id,
          team: (it.team && it.team.length)
            ? { create: it.team.map((m) => ({ displayName: m.displayName, roleInTeam: m.roleInTeam || 'Team Member' })) }
            : undefined,
          tags: tagConnects.length ? { create: tagConnects } : undefined,
          sdgTags: sdgConnects.length ? { create: sdgConnects } : undefined,
          attachments: (it.attachments && it.attachments.length)
            ? {
                create: it.attachments.map((a) => ({
                  kind: a.kind,
                  url: a.url,
                  caption: a.caption || undefined,
                  mimeType: a.mimeType || undefined,
                  sizeBytes: a.sizeBytes ?? undefined,
                })),
              }
            : undefined,
        },
      });
      summary.created++;
      console.log(`${tag}: created — ${it.titleEn}`);
    } catch (err) {
      summary.errors.push(`${it.innovationCode}: ${err.message}`);
      console.error(`${tag}: ERROR ${err.message}`);
    }
  }

  try {
    copyAssets((m) => console.log(`[prod-sync] ${m}`));
  } catch (err) {
    console.error(`[prod-sync] asset copy failed: ${err.message}`);
  }

  console.log(`[prod-sync] DONE created=${summary.created} skipped=${summary.skipped} errors=${summary.errors.length}`);
  if (summary.errors.length) console.log('[prod-sync] ' + summary.errors.join(' | '));
}

main()
  .catch((e) => {
    console.error('[prod-sync] FATAL', e);
  })
  .finally(() => prisma.$disconnect());
