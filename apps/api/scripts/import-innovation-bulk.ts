/**
 * One-off bulk import: "Documents/Innovation Bulk Import Template.xlsx" (sheet "4 DB USE ONLY")
 * -> published Innovation records.
 *
 * Source rows are inconsistent: roughly half (rows 29+) are missing required fields
 * (Category*, Innovation Type*, Problem Statement*, Proposed Solution*). Where the sheet
 * doesn't specify a required value, ROW_OVERRIDES below supplies a best-guess based on the
 * row's title/summary text, and problem/solution text falls back to the English summary.
 * Run once: `npx ts-node scripts/import-innovation-bulk.ts` from apps/api.
 */
import { PrismaClient, InnovationType, DevelopmentStage, IpStatus, FundingSource, OrganizationType } from '@prisma/client';
import slugify from 'slugify';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SheetRow {
  'Row #': number;
  'Title (English)*': string | null;
  'Title (Bangla)': string | null;
  'Summary (English)*': string | null;
  'Summary (Bangla)': string | null;
  'Problem Statement*': string | null;
  'Proposed Solution*': string | null;
  Objectives: string | null;
  'Key Features': string | null;
  'Target Beneficiaries': string | null;
  Impact: string | null;
  'Technology Readiness Level (1-9)': number | null;
  'Innovation Type*': string | null;
  'Development Stage ': string | null;
  'IP Status': string | null;
  'Funding Source': string | null;
  'Commercialization Status': string | null;
  'Replication Potential': string | null;
  'Category*': string | null;
  'Region / Division': string | null;
  'Organization Name': string | null;
  'Organization Type': string | null;
  'Submitter Full Name*': string | null;
  'Submitter Email*': string | null;
  'Tags (comma-separated)': string | null;
  'SDG Tags (numbers, comma-separated)': string | null;
  'Team Members (Name:Role, comma-separated)': string | null;
}

// Best-guess values for rows where the sheet leaves a required field blank.
const ROW_OVERRIDES: Record<number, { category?: string; innovationType?: InnovationType; developmentStage?: DevelopmentStage }> = {
  29: { category: 'ict-digital-technology', innovationType: InnovationType.DIGITAL_SOLUTION, developmentStage: DevelopmentStage.PROTOTYPE_DEVELOPED },
  30: { category: 'ict-digital-technology', innovationType: InnovationType.DIGITAL_SOLUTION, developmentStage: DevelopmentStage.PROTOTYPE_DEVELOPED },
  31: { category: 'ict-digital-technology', innovationType: InnovationType.DIGITAL_SOLUTION },
  32: { category: 'ict-digital-technology', innovationType: InnovationType.DIGITAL_SOLUTION },
  33: { category: 'governance-public-service', innovationType: InnovationType.DIGITAL_SOLUTION },
  34: { category: 'governance-public-service', innovationType: InnovationType.DIGITAL_SOLUTION },
  35: { category: 'governance-public-service', innovationType: InnovationType.DIGITAL_SOLUTION },
  41: { category: 'healthcare-medtech', innovationType: InnovationType.PRODUCT, developmentStage: DevelopmentStage.PROTOTYPE_DEVELOPED },
  43: { innovationType: InnovationType.PRODUCT, developmentStage: DevelopmentStage.PROTOTYPE_DEVELOPED },
  44: { category: 'education-skills', innovationType: InnovationType.DIGITAL_SOLUTION },
  45: { category: 'ict-digital-technology', innovationType: InnovationType.DIGITAL_SOLUTION },
  46: { category: 'education-skills', innovationType: InnovationType.DIGITAL_SOLUTION, developmentStage: DevelopmentStage.PILOT_IMPLEMENTED },
  47: { category: 'education-skills', innovationType: InnovationType.DIGITAL_SOLUTION, developmentStage: DevelopmentStage.PILOT_IMPLEMENTED },
  48: { category: 'education-skills', innovationType: InnovationType.DIGITAL_SOLUTION, developmentStage: DevelopmentStage.PILOT_IMPLEMENTED },
  49: { category: 'ict-digital-technology', innovationType: InnovationType.DIGITAL_SOLUTION, developmentStage: DevelopmentStage.PILOT_IMPLEMENTED },
  50: { category: 'governance-public-service', innovationType: InnovationType.DIGITAL_SOLUTION, developmentStage: DevelopmentStage.PILOT_IMPLEMENTED },
};

const DIVISIONS = ['Dhaka', 'Chattogram', 'Khulna', 'Rajshahi', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];

const INNOVATION_TYPE_MAP: Record<string, InnovationType> = {
  PRODUCT: InnovationType.PRODUCT,
  PROCESS: InnovationType.PROCESS,
  SERVICE: InnovationType.SERVICE,
  DIGITAL_SOLUTION: InnovationType.DIGITAL_SOLUTION,
  TECHNOLOGY: InnovationType.TECHNOLOGY,
  POLICY_INNOVATION: InnovationType.POLICY_INNOVATION,
  RESEARCH_OUTPUT: InnovationType.RESEARCH_OUTPUT,
};

const DEV_STAGE_MAP: Record<string, DevelopmentStage> = {
  IDEA: DevelopmentStage.IDEA,
  PROTOTYPE_DEVELOPED: DevelopmentStage.PROTOTYPE_DEVELOPED,
  PILOT_IMPLEMENTED: DevelopmentStage.PILOT_IMPLEMENTED,
  COMMERCIALIZED: DevelopmentStage.COMMERCIALIZED,
  SCALED: DevelopmentStage.SCALED,
  DISCONTINUED: DevelopmentStage.DISCONTINUED,
};

const ORG_TYPE_MAP: Record<string, OrganizationType> = {
  GOVERNMENT: OrganizationType.GOVERNMENT,
  UNIVERSITY: OrganizationType.UNIVERSITY,
  STARTUP: OrganizationType.STARTUP,
  PRIVATE_SECTOR: OrganizationType.PRIVATE_SECTOR,
  NGO: OrganizationType.NGO,
  RESEARCH_INSTITUTE: OrganizationType.RESEARCH_INSTITUTE,
  INDIVIDUAL: OrganizationType.INDIVIDUAL,
};

function clean(v: string | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  const t = v.replace(/\r\n/g, '\n').trim();
  return t.length > 0 ? t : undefined;
}

function mapEnum<T extends string>(raw: string | null | undefined, map: Record<string, T>): T | undefined {
  const c = clean(raw);
  if (!c) return undefined;
  return map[c.toUpperCase().replace(/[\s/-]+/g, '_')];
}

function mapFundingSource(raw: string | null | undefined): FundingSource | undefined {
  const c = clean(raw)?.toLowerCase();
  if (!c) return undefined;
  if (c.includes('a2i_innovation_fund') || c === 'a2i innovation fund') return FundingSource.A2I_INNOVATION_FUND;
  if (c.includes('a2i/gov') || c.includes('gov')) return FundingSource.GOVERNMENT;
  return undefined;
}

function mapRegionId(raw: string | null | undefined): string | undefined {
  const c = clean(raw);
  if (!c) return undefined;
  const match = DIVISIONS.find((d) => d.toLowerCase() === c.toLowerCase());
  return match ? `division-${match.toLowerCase()}` : undefined;
}

interface ParsedMember {
  displayName: string;
  roleInTeam: string;
}

function parseTeamMembers(raw: string | null | undefined): ParsedMember[] {
  const c = clean(raw);
  if (!c) return [];
  let rawEntries: string[];
  if (c.includes(';')) {
    rawEntries = c.split(';');
  } else if (c.includes(':')) {
    const tokens = c.split(',');
    const entries: string[] = [];
    let current: string | null = null;
    for (const tokRaw of tokens) {
      const tok = tokRaw.trim();
      if (!tok) continue;
      if (tok.includes(':')) {
        if (current !== null) entries.push(current);
        current = tok;
      } else if (current !== null) {
        current += ', ' + tok;
      } else {
        current = tok;
      }
    }
    if (current !== null) entries.push(current);
    rawEntries = entries;
  } else {
    rawEntries = [c];
  }

  return rawEntries
    .map((entryRaw) => {
      const entry = entryRaw.trim().replace(/^\r?\n+/, '');
      const colonIdx = entry.indexOf(':');
      if (colonIdx !== -1) {
        return { displayName: entry.slice(0, colonIdx).trim(), roleInTeam: entry.slice(colonIdx + 1).trim() || 'Team Member' };
      }
      const commaIdx = entry.indexOf(',');
      if (commaIdx !== -1) {
        return { displayName: entry.slice(0, commaIdx).trim(), roleInTeam: entry.slice(commaIdx + 1).trim() || 'Team Member' };
      }
      return { displayName: entry, roleInTeam: 'Team Member' };
    })
    .filter((m) => m.displayName.length > 0);
}

async function main() {
  const rowsPath = path.join(__dirname, 'bulk-import-rows.json');
  const rows: SheetRow[] = JSON.parse(fs.readFileSync(rowsPath, 'utf-8'));

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@nir.gov.bd' } });

  const year = new Date().getFullYear();
  let codeCounter = await prisma.innovation.count({ where: { createdAt: { gte: new Date(`${year}-01-01`) } } });

  const summary = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const rowNum = row['Row #'];
    try {
      const titleEn = clean(row['Title (English)*']);
      if (!titleEn) {
        summary.skipped++;
        console.warn(`Row ${rowNum}: no title, skipping`);
        continue;
      }

      const override = ROW_OVERRIDES[rowNum] ?? {};
      const summaryEn = clean(row['Summary (English)*']) ?? titleEn;

      const categorySlug = clean(row['Category*'])?.toLowerCase() ?? override.category;
      if (!categorySlug) {
        summary.skipped++;
        console.warn(`Row ${rowNum} ("${titleEn}"): no category resolvable, skipping`);
        continue;
      }
      const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!category) {
        summary.skipped++;
        console.warn(`Row ${rowNum} ("${titleEn}"): category slug "${categorySlug}" not found, skipping`);
        continue;
      }

      const innovationType = mapEnum(row['Innovation Type*'], INNOVATION_TYPE_MAP) ?? override.innovationType;
      if (!innovationType) {
        summary.skipped++;
        console.warn(`Row ${rowNum} ("${titleEn}"): no innovation type resolvable, skipping`);
        continue;
      }

      const developmentStage = mapEnum(row['Development Stage '], DEV_STAGE_MAP) ?? override.developmentStage;
      const ipStatus = mapEnum(row['IP Status'], { NONE: IpStatus.NONE, PATENTED: IpStatus.PATENTED, PATENT_PENDING: IpStatus.PATENT_PENDING, UNDER_PROCESSING: IpStatus.UNDER_PROCESSING });
      const fundingSource = mapFundingSource(row['Funding Source']);
      const regionId = mapRegionId(row['Region / Division']);
      const orgType = mapEnum(row['Organization Type'], ORG_TYPE_MAP);
      const orgName = clean(row['Organization Name']);

      let organizationId: string | undefined;
      if (orgName) {
        const existingOrg = await prisma.organization.findFirst({ where: { name: orgName } });
        if (existingOrg) {
          organizationId = existingOrg.id;
        } else {
          const created = await prisma.organization.create({
            data: { name: orgName, type: orgType ?? OrganizationType.PRIVATE_SECTOR, regionId },
          });
          organizationId = created.id;
        }
      }

      const problemStatement = clean(row['Problem Statement*']) ?? summaryEn;
      const proposedSolution = clean(row['Proposed Solution*']) ?? summaryEn;

      codeCounter += 1;
      const innovationCode = `NIR-${year}-${String(codeCounter).padStart(6, '0')}`;
      const baseSlug = slugify(titleEn, { lower: true, strict: true });
      const slug = `${baseSlug}-${innovationCode.split('-').pop()}`;

      const existing = await prisma.innovation.findUnique({ where: { slug } });
      if (existing) {
        summary.skipped++;
        console.warn(`Row ${rowNum} ("${titleEn}"): slug "${slug}" already exists, skipping`);
        continue;
      }

      const teamMembers = parseTeamMembers(row['Team Members (Name:Role, comma-separated)']);
      const submitterName = clean(row['Submitter Full Name*']);
      if (submitterName && !teamMembers.some((m) => m.displayName.toLowerCase() === submitterName.toLowerCase())) {
        teamMembers.unshift({ displayName: submitterName, roleInTeam: 'Submitter' });
      }

      const tagNames = (clean(row['Tags (comma-separated)']) ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.toLowerCase() !== 'not specified');

      const tagConnections = [];
      for (const nameEn of tagNames) {
        const tag = await prisma.tag.upsert({
          where: { type_nameEn: { type: 'THEMATIC', nameEn } },
          update: {},
          create: { type: 'THEMATIC', nameEn, nameBn: nameEn },
        });
        tagConnections.push({ tagId: tag.id });
      }

      await prisma.innovation.create({
        data: {
          innovationCode,
          slug,
          titleEn,
          titleBn: clean(row['Title (Bangla)']),
          summaryEn,
          summaryBn: clean(row['Summary (Bangla)']),
          problemStatement,
          proposedSolution,
          objectives: clean(row['Objectives']),
          keyFeatures: clean(row['Key Features']),
          targetBeneficiaries: clean(row['Target Beneficiaries']),
          impact: clean(row['Impact']),
          technologyReadinessLevel: typeof row['Technology Readiness Level (1-9)'] === 'number' ? row['Technology Readiness Level (1-9)'] : undefined,
          innovationType,
          developmentStage: developmentStage ?? undefined,
          ipStatus: ipStatus ?? undefined,
          fundingSource,
          replicationPotential: clean(row['Replication Potential']),
          categoryId: category.id,
          regionId,
          organizationId,
          submittedById: admin.id,
          reviewStatus: 'PUBLISHED',
          isFeatured: false,
          submittedAt: new Date(),
          publishedAt: new Date(),
          team: teamMembers.length > 0 ? { create: teamMembers.map((m) => ({ displayName: m.displayName, roleInTeam: m.roleInTeam })) } : undefined,
          tags: tagConnections.length > 0 ? { create: tagConnections } : undefined,
        },
      });

      summary.created++;
      console.log(`Row ${rowNum}: created ${innovationCode} — ${titleEn}`);
    } catch (err) {
      summary.errors.push(`Row ${rowNum}: ${(err as Error).message}`);
      console.error(`Row ${rowNum}: ERROR`, err);
    }
  }

  console.log('\n=== Import summary ===');
  console.log(`Created: ${summary.created}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors:  ${summary.errors.length}`);
  if (summary.errors.length) console.log(summary.errors.join('\n'));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
