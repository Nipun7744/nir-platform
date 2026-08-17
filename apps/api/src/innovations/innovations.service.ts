import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus, ReviewStage, Role } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { IdGeneratorService } from '../common/services/id-generator.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { CreateInnovationDto } from './dto/create-innovation.dto';
import { UpdateInnovationDto } from './dto/update-innovation.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { ReplaceAttachmentDto } from './dto/replace-attachment.dto';
import { UpdateFeaturedDto } from './dto/update-featured.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';
import { RepositoryFilterDto } from './dto/repository-filter.dto';
import { ActivityLogFilterDto } from './dto/activity-log-filter.dto';

// ToR Module 1 workflow: Under Review -> Authenticity Review -> Shortlisted/Rejected -> Selected ->
// Approved -> Published/Archived. SELECTED -> APPROVED is the Admin's approval decision (Recognition/
// Mentor/Fund sign-off, via PATCH /innovations/:id/approval with finalize: true — see
// InnovationsService.updateApproval) and is deliberately NOT the same event as publication:
// APPROVED -> PUBLISHED remains a separate, later action.
// PUBLISHED <-> UNPUBLISHED is the Admin Repository Management module's takedown/restore toggle
// (see PROJECT_CONTEXT.md#business-rules) — driven through this same generic transition, same as
// every other status change, so it inherits the standard audit-log/actor-role handling below
// rather than needing its own code path.
const ALLOWED_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  DRAFT: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['AUTHENTICITY_REVIEW', 'REJECTED', 'ARCHIVED'],
  AUTHENTICITY_REVIEW: ['SHORTLISTED', 'REJECTED', 'ARCHIVED'],
  SHORTLISTED: ['SELECTED', 'REJECTED', 'ARCHIVED'],
  SELECTED: ['APPROVED', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'ARCHIVED'],
  REJECTED: ['UNDER_REVIEW', 'ARCHIVED'],
  PUBLISHED: ['UNPUBLISHED', 'ARCHIVED'],
  UNPUBLISHED: ['PUBLISHED', 'ARCHIVED'],
  ARCHIVED: ['UNDER_REVIEW'],
};

const DETAIL_INCLUDE = {
  category: true,
  region: true,
  organization: true,
  team: {
    include: {
      innovator: {
        include: {
          user: {
            select: { fullName: true, avatarUrl: true, designation: true, institution: true },
          },
        },
      },
    },
  },
  attachments: true,
  tags: { include: { tag: true } },
  sdgTags: { include: { sdgTag: true } },
  successStory: true,
  awards: true,
} as const;

@Injectable()
export class InnovationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idGenerator: IdGeneratorService,
    private readonly auditLog: AuditLogService,
  ) {}

  private async assertOwnerOrAdmin(innovationId: string, userId: string, roles: Role[]) {
    const innovation = await this.prisma.innovation.findUnique({ where: { id: innovationId } });
    if (!innovation) throw new NotFoundException('Innovation not found');

    const privilegedRoles: Role[] = [
      Role.PLATFORM_ADMIN,
      Role.SYSTEM_ADMIN,
      Role.INSTITUTIONAL_COORDINATOR,
      Role.INNOVATION_MANAGER,
    ];
    const isPrivileged = roles.some((r) => privilegedRoles.includes(r));
    if (innovation.submittedById !== userId && !isPrivileged) {
      throw new ForbiddenException('You do not have access to this innovation');
    }
    return innovation;
  }

  async create(dto: CreateInnovationDto, userId: string) {
    const innovator = await this.prisma.innovator.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true } } },
    });
    if (!innovator) {
      throw new BadRequestException('Only registered innovators can submit an innovation');
    }

    const innovationCode = await this.idGenerator.nextInnovationCode();
    const baseSlug = slugify(dto.titleEn, { lower: true, strict: true });
    const slug = `${baseSlug}-${innovationCode.split('-').pop()}`;

    const { tagIds, sdgTagIds, ...rest } = dto;

    const innovation = await this.prisma.innovation.create({
      data: {
        ...rest,
        innovationCode,
        slug,
        submittedById: userId,
        reviewStatus: 'DRAFT',
        team: {
          create: {
            innovatorId: innovator.id,
            displayName: innovator.user.fullName,
            roleInTeam: 'Lead Innovator',
          },
        },
        tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
        sdgTags: sdgTagIds?.length ? { create: sdgTagIds.map((sdgTagId) => ({ sdgTagId })) } : undefined,
      },
      include: DETAIL_INCLUDE,
    });

    await this.auditLog.record({
      actorId: userId,
      action: 'INNOVATION_CREATED',
      entityType: 'Innovation',
      entityId: innovation.id,
    });

    return innovation;
  }

  /** Moderation queue — Institutional Coordinator / Platform Admin only (see controller guard). */
  async findAllForModeration(reviewStatus?: ReviewStatus) {
    return this.prisma.innovation.findMany({
      where: reviewStatus ? { reviewStatus } : { reviewStatus: { not: 'DRAFT' } },
      include: DETAIL_INCLUDE,
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Preliminary review inbox — category-routed to Preliminary Reviewers; admins see everything.
   * `reviewStatus: 'REVIEWED'` is a pseudo-status (not a real `ReviewStatus` enum value) meaning
   * "everything this reviewer already forwarded past UNDER_REVIEW" — backs the "Reviewed" tab.
   */
  async findPreliminaryReviewQueue(viewer: { id: string; roles: Role[] }, reviewStatus?: ReviewStatus | 'REVIEWED') {
    const adminRoles: Role[] = [Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN];
    const isAdmin = viewer.roles.some((r) => adminRoles.includes(r));

    let categoryIds: string[] = [];
    if (!isAdmin) {
      const user = await this.prisma.user.findUnique({
        where: { id: viewer.id },
        select: { preliminaryReviewerCategoryIds: true },
      });
      categoryIds = user?.preliminaryReviewerCategoryIds ?? [];
    }

    const forwardedStatuses: ReviewStatus[] = [
      'AUTHENTICITY_REVIEW',
      'SHORTLISTED',
      'SELECTED',
      'PUBLISHED',
      'ARCHIVED',
    ];
    const statusFilter =
      reviewStatus === 'REVIEWED' ? { in: forwardedStatuses } : reviewStatus ?? 'UNDER_REVIEW';
    // Scope the Rejected tab to rejections this stage is actually responsible for — an admin
    // rejecting an AUTHENTICITY_REVIEW submission shouldn't show up as "rejected" work in a
    // Preliminary Reviewer's queue just because it shares a category. Admins bypass this (same as
    // the category bypass above) since they oversee every stage.
    const stageFilter =
      reviewStatus === 'REJECTED' && !isAdmin
        ? { rejectedAtStage: 'PRELIMINARY_REVIEW' as ReviewStage }
        : {};

    return this.prisma.innovation.findMany({
      where: {
        reviewStatus: statusFilter,
        ...stageFilter,
        ...(isAdmin ? {} : { categoryId: { in: categoryIds } }),
      },
      include: DETAIL_INCLUDE,
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Authenticity review inbox — category-routed to Authenticity Reviewers; admins see everything.
   * Sits between preliminary review and expert evaluation: verifies the innovation is
   * authentic, original, and not a duplicate/redundant submission before it reaches evaluators.
   * `reviewStatus: 'REVIEWED'` is a pseudo-status (not a real `ReviewStatus` enum value) meaning
   * "everything this reviewer already forwarded past AUTHENTICITY_REVIEW" — backs the "Reviewed"
   * tab, mirroring `findPreliminaryReviewQueue`'s same convention.
   */
  async findAuthenticityReviewQueue(viewer: { id: string; roles: Role[] }, reviewStatus?: ReviewStatus | 'REVIEWED') {
    const adminRoles: Role[] = [Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN];
    const isAdmin = viewer.roles.some((r) => adminRoles.includes(r));

    let categoryIds: string[] = [];
    if (!isAdmin) {
      const user = await this.prisma.user.findUnique({
        where: { id: viewer.id },
        select: { authenticityReviewerCategoryIds: true },
      });
      categoryIds = user?.authenticityReviewerCategoryIds ?? [];
    }

    const forwardedStatuses: ReviewStatus[] = ['SHORTLISTED', 'SELECTED', 'PUBLISHED', 'ARCHIVED'];
    const statusFilter =
      reviewStatus === 'REVIEWED' ? { in: forwardedStatuses } : reviewStatus ?? 'AUTHENTICITY_REVIEW';
    // Scope the Rejected tab to rejections made at this stage — see the identical comment in
    // findPreliminaryReviewQueue above.
    const stageFilter =
      reviewStatus === 'REJECTED' && !isAdmin
        ? { rejectedAtStage: 'AUTHENTICITY_REVIEW' as ReviewStage }
        : {};
    // Scope the Reviewed tab to shortlists this specific reviewer made — a category can have
    // multiple Authenticity Reviewers, and category alone would show one reviewer another's work.
    // Admins bypass, same as everywhere else in this method.
    const personFilter =
      reviewStatus === 'REVIEWED' && !isAdmin ? { authenticityReviewedById: viewer.id } : {};

    return this.prisma.innovation.findMany({
      where: {
        reviewStatus: statusFilter,
        ...stageFilter,
        ...personFilter,
        ...(isAdmin ? {} : { categoryId: { in: categoryIds } }),
      },
      include: DETAIL_INCLUDE,
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findMine(userId: string) {
    return this.prisma.innovation.findMany({
      where: { submittedById: userId },
      include: DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForViewer(idOrSlug: string, viewer?: { id: string; roles: Role[] }) {
    const innovation = await this.prisma.innovation.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: DETAIL_INCLUDE,
    });
    if (!innovation) throw new NotFoundException('Innovation not found');

    const isPublic = innovation.reviewStatus === 'PUBLISHED';
    if (!isPublic) {
      const isOwner = viewer?.id === innovation.submittedById;
      const fullAccessRoles: Role[] = [
        Role.PLATFORM_ADMIN,
        Role.SYSTEM_ADMIN,
        Role.INSTITUTIONAL_COORDINATOR,
        Role.INNOVATION_MANAGER,
        Role.PRELIMINARY_REVIEWER,
        Role.AUTHENTICITY_REVIEWER,
      ];
      const hasFullAccess = viewer?.roles.some((r) => fullAccessRoles.includes(r));
      // Evaluators must never see submissions that haven't passed preliminary review yet. REJECTED
      // is included so an evaluator who just rejected an innovation (submitEvaluation now moves
      // SHORTLISTED -> REJECTED immediately) can still load their own read-only evaluation summary
      // afterward, instead of it 404ing the moment their own decision takes effect. APPROVED is
      // included for the same reason once an Admin records their approval decision.
      const evaluatorVisibleStatuses: ReviewStatus[] = [
        'SHORTLISTED',
        'SELECTED',
        'APPROVED',
        'REJECTED',
        'PUBLISHED',
        'ARCHIVED',
      ];
      const isEvaluatorWithAccess =
        viewer?.roles.includes(Role.EXPERT_EVALUATOR) &&
        evaluatorVisibleStatuses.includes(innovation.reviewStatus);
      if (!isOwner && !hasFullAccess && !isEvaluatorWithAccess) throw new NotFoundException('Innovation not found');
    } else {
      await this.prisma.innovation.update({
        where: { id: innovation.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return innovation;
  }

  async update(id: string, dto: UpdateInnovationDto, userId: string, roles: Role[]) {
    const innovation = await this.assertOwnerOrAdmin(id, userId, roles);
    if (!['DRAFT', 'REJECTED'].includes(innovation.reviewStatus) && innovation.submittedById === userId) {
      throw new BadRequestException('This innovation can no longer be edited once submitted for review');
    }

    const { tagIds, sdgTagIds, ...rest } = dto;

    const updated = await this.prisma.innovation.update({
      where: { id },
      data: {
        ...rest,
        ...(tagIds
          ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } }
          : {}),
        ...(sdgTagIds
          ? { sdgTags: { deleteMany: {}, create: sdgTagIds.map((sdgTagId) => ({ sdgTagId })) } }
          : {}),
      },
      include: DETAIL_INCLUDE,
    });

    await this.auditLog.record({
      actorId: userId,
      action: 'INNOVATION_UPDATED',
      entityType: 'Innovation',
      entityId: id,
    });

    return updated;
  }

  async submit(id: string, userId: string) {
    const innovation = await this.prisma.innovation.findUnique({ where: { id } });
    if (!innovation) throw new NotFoundException('Innovation not found');
    if (innovation.submittedById !== userId) throw new ForbiddenException('Not your submission');
    if (innovation.reviewStatus !== 'DRAFT' && innovation.reviewStatus !== 'REJECTED') {
      throw new BadRequestException('Only a draft or rejected submission can be submitted for review');
    }

    const updated = await this.prisma.innovation.update({
      where: { id },
      data: { reviewStatus: 'UNDER_REVIEW', submittedAt: new Date(), rejectedAtStage: null },
      include: DETAIL_INCLUDE,
    });

    await this.auditLog.record({
      actorId: userId,
      action: 'INNOVATION_SUBMITTED_FOR_REVIEW',
      entityType: 'Innovation',
      entityId: id,
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, actorId: string, actorRoles: Role[] = []) {
    const innovation = await this.prisma.innovation.findUnique({ where: { id } });
    if (!innovation) throw new NotFoundException('Innovation not found');

    const seniorRoles: Role[] = [
      Role.PLATFORM_ADMIN,
      Role.SYSTEM_ADMIN,
      Role.INSTITUTIONAL_COORDINATOR,
      Role.INNOVATION_MANAGER,
    ];
    const isSenior = actorRoles.some((r) => seniorRoles.includes(r));
    const isPreliminaryReviewerOnly = !isSenior && actorRoles.includes(Role.PRELIMINARY_REVIEWER);
    if (isPreliminaryReviewerOnly) {
      const allowedTargets: ReviewStatus[] = ['AUTHENTICITY_REVIEW', 'REJECTED'];
      if (innovation.reviewStatus !== 'UNDER_REVIEW' || !allowedTargets.includes(dto.reviewStatus)) {
        throw new ForbiddenException('Preliminary reviewers may only forward to authenticity review or reject submissions under review');
      }
      const reviewer = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: { preliminaryReviewerCategoryIds: true },
      });
      if (!reviewer?.preliminaryReviewerCategoryIds.includes(innovation.categoryId)) {
        throw new ForbiddenException('This submission is outside your assigned review categories');
      }
    }

    const isAuthenticityReviewerOnly = !isSenior && actorRoles.includes(Role.AUTHENTICITY_REVIEWER);
    if (isAuthenticityReviewerOnly) {
      const allowedTargets: ReviewStatus[] = ['SHORTLISTED', 'REJECTED'];
      if (innovation.reviewStatus !== 'AUTHENTICITY_REVIEW' || !allowedTargets.includes(dto.reviewStatus)) {
        throw new ForbiddenException('Authenticity reviewers may only shortlist or reject submissions in authenticity review');
      }
      const reviewer = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: { authenticityReviewerCategoryIds: true },
      });
      if (!reviewer?.authenticityReviewerCategoryIds.includes(innovation.categoryId)) {
        throw new ForbiddenException('This submission is outside your assigned review categories');
      }
    }

    const allowed = ALLOWED_TRANSITIONS[innovation.reviewStatus] ?? [];
    if (!allowed.includes(dto.reviewStatus)) {
      throw new BadRequestException(
        `Cannot move from ${innovation.reviewStatus} to ${dto.reviewStatus}`,
      );
    }

    // Which stage's queue this rejection should surface in — derived from the FROM status, not
    // the actor's role, so a senior override (e.g. admin rejecting on a reviewer's behalf) is
    // still attributed to the correct stage. Null (cleared) on any transition away from REJECTED,
    // and also null for a REJECTED reached from neither UNDER_REVIEW nor AUTHENTICITY_REVIEW
    // (e.g. a coordinator rejecting from SHORTLISTED) — that rejection belongs to neither
    // reviewer's queue.
    const rejectedAtStage: ReviewStage | null =
      dto.reviewStatus !== 'REJECTED'
        ? null
        : innovation.reviewStatus === 'UNDER_REVIEW'
          ? 'PRELIMINARY_REVIEW'
          : innovation.reviewStatus === 'AUTHENTICITY_REVIEW'
            ? 'AUTHENTICITY_REVIEW'
            : null;

    // Records exactly which reviewer shortlisted this at the Authenticity stage, since a category
    // can have multiple Authenticity Reviewers assigned — attributed by actor, not role, so a
    // senior override is still credited to whoever actually clicked it. Left untouched on every
    // other transition (including later SELECTED/PUBLISHED moves made by other roles) so the
    // "Reviewed" tab keeps attributing to the original reviewer.
    const authenticityReviewedById =
      innovation.reviewStatus === 'AUTHENTICITY_REVIEW' && dto.reviewStatus === 'SHORTLISTED'
        ? actorId
        : innovation.authenticityReviewedById;

    const updated = await this.prisma.innovation.update({
      where: { id },
      data: {
        reviewStatus: dto.reviewStatus,
        reviewRemarks: dto.note ?? innovation.reviewRemarks,
        rejectedAtStage,
        authenticityReviewedById,
        publishedAt: dto.reviewStatus === 'PUBLISHED' ? new Date() : innovation.publishedAt,
      },
      include: DETAIL_INCLUDE,
    });

    // Preserve each reviewer's note as permanent history — reviewRemarks above only ever
    // holds the single latest note and gets overwritten by the next stage, but Authenticity
    // Reviewers must still see what the Preliminary Reviewer wrote, and Evaluators must still
    // see what both of them wrote, even across later reject/resubmit cycles.
    if (dto.note && (isPreliminaryReviewerOnly || isAuthenticityReviewerOnly)) {
      await this.prisma.reviewComment.create({
        data: {
          innovationId: id,
          authorId: actorId,
          stage: isPreliminaryReviewerOnly ? 'PRELIMINARY_REVIEW' : 'AUTHENTICITY_REVIEW',
          note: dto.note,
        },
      });
    }

    await this.auditLog.record({
      actorId,
      action: 'INNOVATION_STATUS_CHANGED',
      entityType: 'Innovation',
      entityId: id,
      metadata: { from: innovation.reviewStatus, to: dto.reviewStatus, note: dto.note },
    });

    return updated;
  }

  /**
   * Mark/unmark an innovation as featured — surfaces it in the homepage Featured section and the
   * public repository (`RepositoryService.featured`/`CARD_SELECT` already read `isFeatured`; this
   * is the first admin-facing way to set it on an *innovation*, mirroring the existing Challenge
   * featured-toggle pattern). Deliberately a separate small endpoint rather than routed through
   * the generic `PATCH /innovations/:id` update, so the audit entry carries a real before/after
   * instead of a bare "updated" with no metadata. Being featured doesn't require `PUBLISHED` —
   * it only becomes visible once the innovation is actually published, same as any other field set
   * ahead of time.
   */
  async updateFeatured(id: string, dto: UpdateFeaturedDto, actorId: string) {
    const innovation = await this.prisma.innovation.findUnique({ where: { id } });
    if (!innovation) throw new NotFoundException('Innovation not found');

    const updated = await this.prisma.innovation.update({
      where: { id },
      data: { isFeatured: dto.featured },
      include: DETAIL_INCLUDE,
    });

    await this.auditLog.record({
      actorId,
      action: 'INNOVATION_FEATURED_CHANGED',
      entityType: 'Innovation',
      entityId: id,
      metadata: { from: innovation.isFeatured, to: dto.featured },
    });

    return updated;
  }

  /**
   * Full comment history from Preliminary Review and Authenticity Review stages, in
   * chronological order — lets Authenticity Reviewers see what Preliminary Reviewers wrote,
   * and lets Evaluators see the full chain of notes from both earlier stages.
   */
  async listReviewComments(innovationId: string) {
    return this.prisma.reviewComment.findMany({
      where: { innovationId },
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Admin's Recognition/Mentor/Fund approval decision — see the schema comment on
   * Innovation.recognitionApproved for why these three pairs plus one shared
   * approvalLetterUrl exist. Not gated on the matching "*Needed" flag: the frontend only shows
   * the fields the innovator actually requested, but the endpoint itself stays permissive so an
   * admin can still record a decision if a request was withdrawn/edited after the fact.
   */
  async updateApproval(id: string, dto: UpdateApprovalDto, actorId: string) {
    const innovation = await this.prisma.innovation.findUnique({ where: { id } });
    if (!innovation) throw new NotFoundException('Innovation not found');

    const { finalize, ...approvalFields } = dto;
    // "Save approval decisions" on the Admin Evaluations detail page doubles as the Admin's
    // approval decision (SELECTED -> APPROVED) when `finalize` is set — this is what moves the
    // innovation from the Pending tab to Reviewed, and makes ApprovalSection read-only afterward.
    // Deliberately NOT the same event as publication: APPROVED only means the Admin has recorded a
    // decision on the Recognition/Mentor/Fund requests, not that the innovation is live in the
    // public repository — publishing (APPROVED -> PUBLISHED) remains a separate, later action, not
    // triggered here. Guarded on the innovation still being at SELECTED so this is a no-op if it
    // was already decided, or hasn't reached that stage.
    const shouldApprove = Boolean(finalize) && innovation.reviewStatus === 'SELECTED';

    const updated = await this.prisma.innovation.update({
      where: { id },
      data: {
        ...approvalFields,
        ...(shouldApprove ? { reviewStatus: 'APPROVED' as ReviewStatus } : {}),
      },
      include: DETAIL_INCLUDE,
    });

    await this.auditLog.record({
      actorId,
      action: 'INNOVATION_APPROVAL_UPDATED',
      entityType: 'Innovation',
      entityId: id,
      metadata: { ...approvalFields, approvedViaDecision: shouldApprove },
    });

    return updated;
  }

  async addTeamMember(id: string, dto: AddTeamMemberDto, userId: string, roles: Role[]) {
    await this.assertOwnerOrAdmin(id, userId, roles);
    return this.prisma.innovationTeamMember.create({
      data: { innovationId: id, ...dto },
    });
  }

  async removeTeamMember(id: string, memberId: string, userId: string, roles: Role[]) {
    await this.assertOwnerOrAdmin(id, userId, roles);
    return this.prisma.innovationTeamMember.delete({ where: { id: memberId } });
  }

  async addAttachment(id: string, dto: AddAttachmentDto, userId: string, roles: Role[]) {
    await this.assertOwnerOrAdmin(id, userId, roles);
    const attachment = await this.prisma.innovationAttachment.create({
      data: { innovationId: id, ...dto },
    });

    await this.auditLog.record({
      actorId: userId,
      action: 'INNOVATION_MEDIA_UPLOADED',
      entityType: 'Innovation',
      entityId: id,
      metadata: { attachmentId: attachment.id, kind: attachment.kind, url: attachment.url, caption: attachment.caption },
    });

    return attachment;
  }

  async removeAttachment(id: string, attachmentId: string, userId: string, roles: Role[]) {
    await this.assertOwnerOrAdmin(id, userId, roles);
    const attachment = await this.prisma.innovationAttachment.delete({ where: { id: attachmentId } });

    await this.auditLog.record({
      actorId: userId,
      action: 'INNOVATION_MEDIA_REMOVED',
      entityType: 'Innovation',
      entityId: id,
      metadata: { attachmentId: attachment.id, kind: attachment.kind, url: attachment.url, caption: attachment.caption },
    });

    return attachment;
  }

  /**
   * Swaps the file behind an existing photo/video/document without changing its position in the
   * attachments list — distinct from remove-then-add, which the Repository Management UI needs
   * for a one-click "Replace" action that logs a single before/after audit entry instead of two
   * unrelated remove/add entries.
   */
  async replaceAttachment(id: string, attachmentId: string, dto: ReplaceAttachmentDto, userId: string, roles: Role[]) {
    await this.assertOwnerOrAdmin(id, userId, roles);
    const existing = await this.prisma.innovationAttachment.findUnique({ where: { id: attachmentId } });
    if (!existing || existing.innovationId !== id) throw new NotFoundException('Attachment not found');

    const updated = await this.prisma.innovationAttachment.update({
      where: { id: attachmentId },
      data: {
        url: dto.url,
        caption: dto.caption ?? existing.caption,
        mimeType: dto.mimeType ?? existing.mimeType,
        sizeBytes: dto.sizeBytes ?? existing.sizeBytes,
        kind: dto.kind ?? existing.kind,
      },
    });

    await this.auditLog.record({
      actorId: userId,
      action: 'INNOVATION_MEDIA_REPLACED',
      entityType: 'Innovation',
      entityId: id,
      metadata: { attachmentId, kind: updated.kind, previousUrl: existing.url, newUrl: updated.url },
    });

    return updated;
  }

  /**
   * Repository Management listing (Platform/System Admin only, guarded at the controller) —
   * scoped to innovations the public repository cares about: currently live (`PUBLISHED`),
   * taken down (`UNPUBLISHED`), or approved but never yet published (`APPROVED`) so this is also
   * the module's dedicated first-publish surface (previously only reachable via the Moderation
   * page's generic transition tool — see ROADMAP.md). See PROJECT_CONTEXT.md#business-rules.
   */
  async findForRepositoryManagement(filters: RepositoryFilterDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where: Prisma.InnovationWhereInput = {
      reviewStatus: filters.status ? filters.status : { in: ['APPROVED', 'PUBLISHED', 'UNPUBLISHED'] },
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.q
        ? {
            OR: [
              { titleEn: { contains: filters.q, mode: 'insensitive' } },
              { titleBn: { contains: filters.q, mode: 'insensitive' } },
              { innovationCode: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            publishedAt: {
              ...(filters.fromDate ? { gte: new Date(`${filters.fromDate}T00:00:00`) } : {}),
              ...(filters.toDate ? { lte: new Date(`${filters.toDate}T23:59:59.999`) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.innovation.findMany({
        where,
        include: DETAIL_INCLUDE,
        // Postgres defaults nulls to the front on DESC — without an explicit `nulls: 'last'`,
        // never-published APPROVED innovations (publishedAt is null) would jump ahead of
        // recently-published ones instead of settling at the bottom.
        orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.innovation.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  /**
   * Admin activity log — every INNOVATION_* audit entry (status changes, media changes, approval
   * decisions), optionally scoped to one innovation. Backs both the Repository Management page's
   * per-innovation history panel and its "recent activity" feed. Platform/System Admin only.
   */
  async listActivityLog(filters: ActivityLogFilterDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;

    const where: Prisma.AuditLogWhereInput = {
      entityType: 'Innovation',
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
