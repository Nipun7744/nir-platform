import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Challenge, Prisma, Role } from '@prisma/client';
import { statSync } from 'fs';
import { basename, join } from 'path';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { IdGeneratorService } from '../common/services/id-generator.service';
import {
  CreateChallengeDto,
  SaveFormDto,
  SubmissionFilterDto,
  SubmitChallengeDto,
  UpdateChallengeDto,
} from './dto/challenge.dto';
import {
  FieldDefinition,
  FileLookup,
  mappedValue,
  normalizeFormDefinition,
  submissionState,
  validateResponses,
} from './challenge-rules';

const ADMIN_ROLES: Role[] = [Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN];
const isAdmin = (roles?: Role[]) => Boolean(roles?.some((r) => ADMIN_ROLES.includes(r)));

/** Optional details-page text columns — blank input is stored as NULL (see toData). */
const DETAIL_TEXT_FIELDS = [
  'problemStatementEn', 'problemStatementBn', 'eligibilityEn', 'eligibilityBn',
  'evaluationCriteriaEn', 'evaluationCriteriaBn', 'prizeDetailsEn', 'prizeDetailsBn',
  'additionalInfoEn', 'additionalInfoBn', 'contactName', 'contactEmail', 'contactPhone',
] as const;

type Viewer = { id: string; roles: Role[] } | undefined;
type ChallengeWithCount = Challenge & { _count: { formFields: number; innovations?: number } };

/** Uploads live on local disk (see UploadsController); a lookup that only sees our own files. */
const uploadFileLookup: FileLookup = (url) => {
  try {
    const st = statSync(join(process.env.UPLOAD_DIR ?? './uploads', basename(url)));
    return st.isFile() ? { sizeBytes: st.size } : null;
  } catch {
    return null;
  }
};

function attachmentKind(mime: string | null, url: string) {
  const m = mime ?? '';
  if (m.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(url)) return 'PHOTO' as const;
  if (m.startsWith('video/') || /\.(mp4|webm)$/i.test(url)) return 'VIDEO' as const;
  return 'DOCUMENT' as const;
}

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  /** Adds the computed `acceptingSubmissions` / `closedReason` and hides the raw `_count`. */
  private withState<T extends ChallengeWithCount>(c: T) {
    const { _count, ...rest } = c;
    return {
      ...rest,
      formFieldCount: _count.formFields,
      ...(_count.innovations !== undefined ? { submissionCount: _count.innovations } : {}),
      ...submissionState({ ...c, formFieldCount: _count.formFields }),
    };
  }

  // ------------------------------------------------------------------ public reads

  async listPublic() {
    const rows = await this.prisma.challenge.findMany({
      where: { isPublished: true },
      orderBy: { deadline: 'asc' },
      include: { _count: { select: { formFields: true } } },
    });
    return rows.map((c) => this.withState(c));
  }

  /** Unpublished challenges 404 for everyone except admins (who can preview them). */
  private async findVisible(slug: string, viewer: Viewer) {
    const c = await this.prisma.challenge.findUnique({
      where: { slug },
      include: { _count: { select: { formFields: true } } },
    });
    if (!c || (!c.isPublished && !isAdmin(viewer?.roles))) throw new NotFoundException('Challenge not found');
    return c;
  }

  async findBySlug(slug: string, viewer: Viewer) {
    return this.withState(await this.findVisible(slug, viewer));
  }

  /** The dynamic submission form for one challenge, as rendered on /challenges/:slug/submit. */
  async getForm(slug: string, viewer: Viewer) {
    const c = await this.findVisible(slug, viewer);
    const fields = await this.prisma.challengeFormField.findMany({
      where: { challengeId: c.id },
      orderBy: { sortOrder: 'asc' },
    });
    return { challenge: this.withState(c), fields };
  }

  // ------------------------------------------------------------------ admin

  async listAdmin() {
    const rows = await this.prisma.challenge.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { formFields: true, innovations: true } } },
    });
    return rows.map((c) => this.withState(c));
  }

  async getAdmin(id: string) {
    const c = await this.prisma.challenge.findUnique({
      where: { id },
      include: {
        _count: { select: { formFields: true, innovations: true } },
        formFields: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!c) throw new NotFoundException('Challenge not found');
    return this.withState(c);
  }

  private async assertCategory(categoryId?: string | null) {
    if (!categoryId) return;
    const exists = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!exists) throw new BadRequestException('Unknown category');
  }

  private toData(dto: CreateChallengeDto | UpdateChallengeDto) {
    const { startDate, deadline, categoryId, timelinePhases, faqs, resources, ...rest } = dto;
    const date = (v?: string) => (v === undefined ? undefined : v === '' ? null : new Date(v));
    // Details-page text fields: trim, and store blank as NULL so the public page hides the section.
    const optionalText: Record<string, string | null> = {};
    for (const key of DETAIL_TEXT_FIELDS) {
      const v = (rest as Record<string, unknown>)[key];
      if (typeof v === 'string') optionalText[key] = v.trim() || null;
    }
    const trim = (v?: string) => v?.trim() || undefined;
    return {
      ...rest,
      ...optionalText,
      ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
      ...(timelinePhases !== undefined
        ? { timelinePhases: timelinePhases.map((p) => ({ label: p.label.trim(), date: trim(p.date), description: trim(p.description) })) }
        : {}),
      ...(faqs !== undefined ? { faqs: faqs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })) } : {}),
      ...(resources !== undefined ? { resources: resources.map((r) => ({ label: r.label.trim(), url: r.url.trim() })) } : {}),
      startDate: date(startDate),
      deadline: date(deadline),
    };
  }

  private rethrowUnique(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException('That slug is already used by another challenge');
    }
    throw err;
  }

  async create(dto: CreateChallengeDto, actorId: string) {
    await this.assertCategory(dto.categoryId);
    if (dto.submissionsEnabled && !dto.categoryId) {
      throw new BadRequestException('Choose a category before enabling submissions — it routes submissions to reviewers');
    }
    if (dto.isFeatured) await this.prisma.challenge.updateMany({ data: { isFeatured: false } });
    const created = await this.prisma.challenge
      .create({ data: this.toData(dto) as Prisma.ChallengeUncheckedCreateInput })
      .catch((e) => this.rethrowUnique(e));
    await this.auditLog.record({ actorId, action: 'CHALLENGE_CREATED', entityType: 'Challenge', entityId: created.id });
    return created;
  }

  async update(id: string, dto: UpdateChallengeDto, actorId: string) {
    const existing = await this.prisma.challenge.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Challenge not found');
    await this.assertCategory(dto.categoryId);

    const nextCategory = dto.categoryId !== undefined ? dto.categoryId || null : existing.categoryId;
    const nextEnabled = dto.submissionsEnabled ?? existing.submissionsEnabled;
    if (nextEnabled && !nextCategory) {
      throw new BadRequestException('Choose a category before enabling submissions — it routes submissions to reviewers');
    }
    if (dto.isFeatured) await this.prisma.challenge.updateMany({ where: { id: { not: id } }, data: { isFeatured: false } });

    const updated = await this.prisma.challenge
      .update({ where: { id }, data: this.toData(dto) as Prisma.ChallengeUncheckedUpdateInput })
      .catch((e) => this.rethrowUnique(e));

    // Log the publication / activation / submission switches explicitly — they change what the
    // public can do, so they belong in the audit trail with before/after values.
    const switches = ['isPublished', 'isActive', 'submissionsEnabled', 'status'] as const;
    const changed = Object.fromEntries(
      switches
        .filter((k) => dto[k] !== undefined && dto[k] !== existing[k])
        .map((k) => [k, { from: existing[k], to: dto[k] }]),
    );
    await this.auditLog.record({
      actorId,
      action: 'CHALLENGE_UPDATED',
      entityType: 'Challenge',
      entityId: id,
      metadata: Object.keys(changed).length ? changed : undefined,
    });
    return updated;
  }

  async remove(id: string, actorId: string) {
    const count = await this.prisma.innovation.count({ where: { challengeId: id } });
    if (count > 0) {
      throw new ConflictException(
        `This challenge has ${count} submission${count === 1 ? '' : 's'} and cannot be deleted. Unpublish or deactivate it instead.`,
      );
    }
    await this.prisma.challenge.delete({ where: { id } }).catch((e) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new NotFoundException('Challenge not found');
      throw e;
    });
    await this.auditLog.record({ actorId, action: 'CHALLENGE_DELETED', entityType: 'Challenge', entityId: id });
  }

  /**
   * Replaces the challenge's whole form definition (the builder edits locally and saves at once).
   * Existing field ids/keys are preserved so the builder can round-trip them; past submissions are
   * unaffected either way because they store their own snapshot.
   */
  async saveForm(id: string, dto: SaveFormDto, actorId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id },
      include: { formFields: { select: { id: true } } },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const { fields, errors } = normalizeFormDefinition(dto.fields);
    if (errors.length) throw new BadRequestException(errors);

    const ownIds = new Set(challenge.formFields.map((f) => f.id));
    await this.prisma.$transaction([
      this.prisma.challengeFormField.deleteMany({ where: { challengeId: id } }),
      this.prisma.challengeFormField.createMany({
        data: fields.map(({ id: fieldId, ...f }) => ({
          ...f,
          // Only keep ids that already belonged to this challenge — never let a payload claim
          // another challenge's field id.
          ...(fieldId && ownIds.has(fieldId) ? { id: fieldId } : {}),
          challengeId: id,
        })),
      }),
    ]);

    await this.auditLog.record({
      actorId,
      action: 'CHALLENGE_FORM_UPDATED',
      entityType: 'Challenge',
      entityId: id,
      metadata: { fieldCount: fields.length },
    });
    return this.getAdmin(id);
  }

  // ------------------------------------------------------------------ submission

  /**
   * Challenge-based submission. Creates a normal Innovation (channel CHALLENGE, linked to the
   * challenge) straight into UNDER_REVIEW, so it flows through the existing Primary →
   * Authenticity → Expert → Admin pipeline unchanged — routed to reviewers by the challenge's
   * category.
   */
  async submit(slug: string, dto: SubmitChallengeDto, user: { id: string; roles: Role[] }) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { slug },
      include: { formFields: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!challenge || !challenge.isPublished) throw new NotFoundException('Challenge not found');

    const state = submissionState({ ...challenge, formFieldCount: challenge.formFields.length });
    if (!state.acceptingSubmissions) throw new ForbiddenException(state.closedReason);

    const innovator = await this.prisma.innovator.findUnique({
      where: { userId: user.id },
      include: { user: { select: { fullName: true } } },
    });
    if (!innovator) {
      throw new ForbiddenException('Only registered innovators can submit to a challenge. Please register as an innovator.');
    }

    const fields: FieldDefinition[] = challenge.formFields;
    const { errors, entries } = validateResponses(fields, dto.responses, uploadFileLookup);
    if (Object.keys(errors).length) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Please correct the highlighted fields.',
        fieldErrors: errors,
      });
    }

    const firstLongText = entries.find((e) => e.type === 'LONG_TEXT' && typeof e.value === 'string' && e.value)?.value as string | undefined;
    const titleEn =
      mappedValue(entries, fields, 'TITLE') ?? `${challenge.titleEn} — submission by ${innovator.user.fullName}`;
    const summaryEn = mappedValue(entries, fields, 'SUMMARY') ?? firstLongText ?? `Submission to ${challenge.titleEn}`;
    const seeResponses = `See the challenge submission responses (${challenge.titleEn}).`;

    const innovationCode = await this.idGenerator.nextInnovationCode();
    const slugBase = slugify(titleEn, { lower: true, strict: true }).slice(0, 80) || 'challenge-submission';
    const files = entries.flatMap((e) => (e.files ?? []).map((f) => ({ ...f, label: e.label })));
    const now = new Date();

    const innovation = await this.prisma.innovation.create({
      data: {
        innovationCode,
        slug: `${slugBase}-${innovationCode.split('-').pop()}`,
        titleEn: titleEn.slice(0, 300),
        summaryEn,
        problemStatement: mappedValue(entries, fields, 'PROBLEM_STATEMENT') ?? seeResponses,
        proposedSolution: mappedValue(entries, fields, 'PROPOSED_SOLUTION') ?? seeResponses,
        // Not collected by challenge forms; reviewers classify from the responses. PRODUCT is the
        // first InnovationType value and carries no meaning beyond satisfying the required column.
        innovationType: 'PRODUCT',
        categoryId: challenge.categoryId!,
        submittedById: user.id,
        submissionChannel: 'CHALLENGE',
        challengeId: challenge.id,
        challengeResponses: entries as unknown as Prisma.InputJsonValue,
        reviewStatus: 'UNDER_REVIEW',
        submittedAt: now,
        team: {
          create: { innovatorId: innovator.id, displayName: innovator.user.fullName, roleInTeam: 'Lead Innovator' },
        },
        attachments: files.length
          ? {
              create: files.map((f) => ({
                kind: attachmentKind(f.mimeType, f.url),
                url: f.url,
                caption: `${f.label}: ${f.name}`.slice(0, 300),
                mimeType: f.mimeType,
                sizeBytes: f.sizeBytes,
              })),
            }
          : undefined,
      },
      select: { id: true, innovationCode: true, slug: true, titleEn: true, reviewStatus: true, submittedAt: true },
    });

    await this.auditLog.record({
      actorId: user.id,
      action: 'INNOVATION_CHALLENGE_SUBMITTED',
      entityType: 'Innovation',
      entityId: innovation.id,
      metadata: { challengeId: challenge.id, challengeSlug: challenge.slug },
    });

    return { ...innovation, challenge: { id: challenge.id, slug: challenge.slug, titleEn: challenge.titleEn } };
  }

  // ------------------------------------------------------------------ monitoring

  /** Admin submission monitoring across both channels (general + challenge). */
  async listSubmissions(f: SubmissionFilterDto) {
    const page = Math.max(1, f.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20));
    const where: Prisma.InnovationWhereInput = {
      ...(f.channel ? { submissionChannel: f.channel } : {}),
      ...(f.challengeId ? { challengeId: f.challengeId } : {}),
      ...(f.reviewStatus ? { reviewStatus: f.reviewStatus } : f.includeDrafts === 'true' ? {} : { reviewStatus: { not: 'DRAFT' } }),
    };
    if (f.fromDate || f.toDate) {
      const to = f.toDate ? new Date(f.toDate) : undefined;
      to?.setUTCHours(23, 59, 59, 999);
      where.submittedAt = { ...(f.fromDate ? { gte: new Date(f.fromDate) } : {}), ...(to ? { lte: to } : {}) };
    }
    const q = f.q?.trim();
    if (q) {
      const users = await this.prisma.user.findMany({
        where: { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] },
        select: { id: true },
        take: 500,
      });
      where.OR = [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { innovationCode: { contains: q, mode: 'insensitive' } },
        ...(users.length ? [{ submittedById: { in: users.map((u) => u.id) } }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.innovation.findMany({
        where,
        orderBy: [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          innovationCode: true,
          slug: true,
          titleEn: true,
          reviewStatus: true,
          submissionChannel: true,
          submittedAt: true,
          createdAt: true,
          submittedById: true,
          category: { select: { nameEn: true } },
          challenge: { select: { id: true, slug: true, titleEn: true } },
        },
      }),
      this.prisma.innovation.count({ where }),
    ]);

    // submittedById has no formal relation on Innovation (see schema), so join users by hand.
    const submitters = await this.prisma.user.findMany({
      where: { id: { in: Array.from(new Set(items.map((i) => i.submittedById))) } },
      select: { id: true, fullName: true, email: true },
    });
    const byId = new Map(submitters.map((u) => [u.id, u]));

    return {
      items: items.map((i) => ({ ...i, submittedBy: byId.get(i.submittedById) ?? null })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
