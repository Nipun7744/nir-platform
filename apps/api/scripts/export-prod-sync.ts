/**
 * One-off: export the local-only PUBLISHED innovations (those NOT already in the Railway
 * production DB) to a DB-agnostic JSON bundle for import via `import-prod-sync.js`.
 *
 * Production already has NIR-2025-000001/2/3/5/7/8 (the original seed subset); this exports the
 * other 31 PUBLISHED innovations. Category is referenced by slug and submitter by email (their
 * cuid ids differ between databases); region ids (`division-*`) and SDG codes are seed-stable.
 *
 * Run from apps/api:  npx ts-node scripts/export-prod-sync.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const PROD_CODES = [
  'NIR-2025-000001',
  'NIR-2025-000002',
  'NIR-2025-000003',
  'NIR-2025-000005',
  'NIR-2025-000007',
  'NIR-2025-000008',
];

const OUT_JSON = path.join(__dirname, 'prod-sync-data.json');
const ASSETS_DIR = path.join(__dirname, 'prod-sync-assets');
const LOCAL_UPLOADS = path.join(__dirname, '..', 'uploads');

async function main() {
  const rows = await prisma.innovation.findMany({
    where: { reviewStatus: 'PUBLISHED', innovationCode: { notIn: PROD_CODES } },
    orderBy: { innovationCode: 'asc' },
    include: {
      category: { select: { slug: true } },
      organization: {
        select: { name: true, type: true, websiteUrl: true, logoUrl: true, isVerified: true, region: { select: { id: true } } },
      },
      team: { select: { displayName: true, roleInTeam: true } },
      tags: { include: { tag: { select: { type: true, nameEn: true, nameBn: true } } } },
      sdgTags: { include: { sdgTag: { select: { code: true } } } },
      attachments: { select: { kind: true, url: true, caption: true, mimeType: true, sizeBytes: true } },
    },
  });

  const submitterIds = [...new Set(rows.map((r) => r.submittedById))];
  const submitters = await prisma.user.findMany({
    where: { id: { in: submitterIds } },
    select: { id: true, email: true },
  });
  const emailById = new Map(submitters.map((u) => [u.id, u.email]));

  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
  const copiedAssets: string[] = [];

  const innovations = rows.map((r) => {
    for (const a of r.attachments) {
      const base = a.url.replace(/^\/uploads\//, '');
      const src = path.join(LOCAL_UPLOADS, base);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(ASSETS_DIR, base));
        if (!copiedAssets.includes(base)) copiedAssets.push(base);
      } else {
        console.warn(`  ! asset missing on disk, DB row kept: ${a.url}`);
      }
    }
    return {
      innovationCode: r.innovationCode,
      slug: r.slug,
      titleEn: r.titleEn,
      titleBn: r.titleBn,
      summaryEn: r.summaryEn,
      summaryBn: r.summaryBn,
      problemStatement: r.problemStatement,
      proposedSolution: r.proposedSolution,
      objectives: r.objectives,
      keyFeatures: r.keyFeatures,
      targetBeneficiaries: r.targetBeneficiaries,
      impact: r.impact,
      technologyReadinessLevel: r.technologyReadinessLevel,
      innovationType: r.innovationType,
      developmentStage: r.developmentStage,
      ipStatus: r.ipStatus,
      fundingSource: r.fundingSource,
      commercializationStatus: r.commercializationStatus,
      replicationPotential: r.replicationPotential,
      mentorshipNeeded: r.mentorshipNeeded,
      fundingNeeded: r.fundingNeeded,
      recognitionNeeded: r.recognitionNeeded,
      latitude: r.latitude,
      longitude: r.longitude,
      pipelineStage: r.pipelineStage,
      isFeatured: r.isFeatured,
      languageOriginal: r.languageOriginal,
      reviewStatus: r.reviewStatus,
      submittedAt: r.submittedAt,
      publishedAt: r.publishedAt,
      categorySlug: r.category.slug,
      regionId: r.regionId,
      submitterEmail: emailById.get(r.submittedById) ?? null,
      organization: r.organization
        ? {
            name: r.organization.name,
            type: r.organization.type,
            websiteUrl: r.organization.websiteUrl,
            logoUrl: r.organization.logoUrl,
            isVerified: r.organization.isVerified,
            regionId: r.organization.region?.id ?? null,
          }
        : null,
      team: r.team,
      tags: r.tags.map((t) => t.tag),
      sdgCodes: r.sdgTags.map((s) => s.sdgTag.code),
      attachments: r.attachments,
    };
  });

  fs.writeFileSync(OUT_JSON, JSON.stringify({ innovations }, null, 2));
  console.log(`Wrote ${innovations.length} innovations -> ${path.relative(process.cwd(), OUT_JSON)}`);
  console.log(`Copied ${copiedAssets.length} asset file(s) -> ${path.relative(process.cwd(), ASSETS_DIR)}${copiedAssets.length ? ': ' + copiedAssets.join(', ') : ''}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
