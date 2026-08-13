import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignPanelDto } from './dto/assign-panel.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { IpFlagDto } from './dto/ip-flag.dto';

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async assignPanel(dto: AssignPanelDto, assignedById: string) {
    const assignment = await this.prisma.evaluationPanelAssignment.upsert({
      where: { innovationId_evaluatorId: { innovationId: dto.innovationId, evaluatorId: dto.evaluatorId } },
      update: { expertDomainTagId: dto.expertDomainTagId },
      create: { ...dto, assignedById },
    });

    await this.notifications.send({
      userId: dto.evaluatorId,
      templateCode: 'EVALUATION_ASSIGNED',
      channel: 'EMAIL' as any,
      payload: { innovationId: dto.innovationId },
    });

    await this.auditLog.record({
      actorId: assignedById,
      action: 'EVALUATOR_ASSIGNED',
      entityType: 'Innovation',
      entityId: dto.innovationId,
      metadata: { evaluatorId: dto.evaluatorId },
    });

    return assignment;
  }

  private readonly innovationSummarySelect = {
    id: true,
    innovationCode: true,
    slug: true,
    titleEn: true,
    reviewStatus: true,
    category: true,
    createdAt: true,
  } as const;

  async listAssignedToMe(evaluatorId: string) {
    const [evaluator, assignments, submittedEvaluations] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: evaluatorId }, select: { evaluatorCategoryIds: true } }),
      this.prisma.evaluationPanelAssignment.findMany({
        where: { evaluatorId },
        include: { innovation: { select: this.innovationSummarySelect } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.evaluation.findMany({
        where: { evaluatorId, submittedAt: { not: null } },
        select: { innovationId: true },
      }),
    ]);

    const categoryIds = evaluator?.evaluatorCategoryIds ?? [];
    const alreadyAssignedIds = new Set(assignments.map((a) => a.innovationId));
    const submittedIds = new Set(submittedEvaluations.map((e) => e.innovationId));

    // Innovations in an evaluator's own category are surfaced here automatically,
    // even without an explicit panel assignment from a coordinator — but only once
    // they've passed preliminary review, never raw or rejected submissions.
    const categoryMatches = categoryIds.length
      ? await this.prisma.innovation.findMany({
          where: {
            categoryId: { in: categoryIds },
            reviewStatus: 'SHORTLISTED',
            id: { notIn: [...alreadyAssignedIds] },
          },
          select: this.innovationSummarySelect,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const autoMatched = categoryMatches.map((innovation) => ({
      id: `category-match-${innovation.id}`,
      innovationId: innovation.id,
      evaluatorId,
      createdAt: innovation.createdAt,
      autoMatched: true,
      innovation,
      evaluationSubmitted: submittedIds.has(innovation.id),
    }));

    const assignmentsWithStatus = assignments.map((a) => ({
      ...a,
      evaluationSubmitted: submittedIds.has(a.innovationId),
    }));

    return [...assignmentsWithStatus, ...autoMatched].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async submitEvaluation(dto: SubmitEvaluationDto, evaluatorId: string) {
    const existing = await this.prisma.evaluation.findUnique({
      where: { innovationId_evaluatorId: { innovationId: dto.innovationId, evaluatorId } },
    });
    if (existing) {
      throw new ConflictException('You have already submitted an evaluation for this innovation.');
    }

    const values = Object.values(dto.scores);
    const totalScore = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

    const evaluation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.evaluation.create({
        data: {
          innovationId: dto.innovationId,
          evaluatorId,
          scores: dto.scores as any,
          totalScore: totalScore ?? undefined,
          comments: dto.comments,
          recommendation: dto.recommendation,
          submittedAt: new Date(),
        },
      });

      // The Expert Evaluator's own SHORTLIST/REJECT decision is what advances (or ends) the
      // innovation's review pipeline — no separate Admin/Coordinator "Move to SELECTED" step is
      // used or needed for this transition (see ModerationPage, which no longer offers it from
      // SHORTLISTED). Guarded on the innovation still being at SHORTLISTED so a second assigned
      // evaluator's later submission can't re-fire or clobber a decision another evaluator
      // already made — first evaluator to submit SHORTLIST/REJECT decides the outcome. FUND
      // (a legacy third recommendation value, no longer offered by the evaluator UI, kept valid
      // in the enum for old data) intentionally triggers no transition here.
      const nextStatus =
        dto.recommendation === 'SHORTLIST' ? 'SELECTED' : dto.recommendation === 'REJECT' ? 'REJECTED' : null;
      if (nextStatus) {
        const innovation = await tx.innovation.findUnique({ where: { id: dto.innovationId } });
        if (innovation?.reviewStatus === 'SHORTLISTED') {
          await tx.innovation.update({
            where: { id: dto.innovationId },
            data: {
              reviewStatus: nextStatus,
              reviewRemarks: dto.comments ?? innovation.reviewRemarks,
            },
          });
        }
      }

      return created;
    });

    await this.auditLog.record({
      actorId: evaluatorId,
      action: 'EVALUATION_SUBMITTED',
      entityType: 'Innovation',
      entityId: dto.innovationId,
      metadata: { recommendation: dto.recommendation, totalScore },
    });

    return evaluation;
  }

  async listForInnovation(innovationId: string) {
    return this.prisma.evaluation.findMany({
      where: { innovationId },
      include: { evaluator: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listShortlisted() {
    return this.prisma.evaluation.findMany({
      where: { recommendation: 'SHORTLIST' },
      include: {
        innovation: { select: this.innovationSummarySelect },
        evaluator: { select: { id: true, fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async listIpFlags() {
    return this.prisma.ipAdvisoryFlag.findMany({
      include: {
        innovation: { select: this.innovationSummarySelect },
        flaggedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async flagIp(dto: IpFlagDto, flaggedById: string) {
    const flag = await this.prisma.ipAdvisoryFlag.create({
      data: { innovationId: dto.innovationId, flaggedById, note: dto.note },
    });
    await this.auditLog.record({
      actorId: flaggedById,
      action: 'IP_ADVISORY_FLAGGED',
      entityType: 'Innovation',
      entityId: dto.innovationId,
    });
    return flag;
  }
}
