import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { RegisterFocalPointDto, CreateCycleDto, CreateSubmissionDto } from './dto/ministries.dto';

@Injectable()
export class MinistriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registerFocalPoint(userId: string, dto: RegisterFocalPointDto) {
    const focalPoint = await this.prisma.ministryFocalPoint.upsert({
      where: { userId },
      update: { ministryId: dto.ministryId, title: dto.title },
      create: { userId, ministryId: dto.ministryId, title: dto.title },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.roles.includes(Role.MINISTRY_FOCAL_POINT)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { roles: { push: Role.MINISTRY_FOCAL_POINT } },
      });
    }
    return focalPoint;
  }

  createCycle(dto: CreateCycleDto) {
    return this.prisma.ministrySubmissionCycle.create({
      data: { year: dto.year, opensAt: new Date(dto.opensAt), closesAt: new Date(dto.closesAt) },
    });
  }

  cycles() {
    return this.prisma.ministrySubmissionCycle.findMany({ orderBy: { year: 'desc' } });
  }

  currentCycle() {
    const now = new Date();
    return this.prisma.ministrySubmissionCycle.findFirst({
      where: { opensAt: { lte: now }, closesAt: { gte: now } },
      orderBy: { year: 'desc' },
    });
  }

  async createSubmission(focalPointUserId: string, dto: CreateSubmissionDto) {
    const focalPoint = await this.prisma.ministryFocalPoint.findUnique({ where: { userId: focalPointUserId } });
    if (!focalPoint) throw new BadRequestException('Register as a ministry focal point first');

    const cycle = await this.prisma.ministrySubmissionCycle.findUnique({ where: { id: dto.cycleId } });
    if (!cycle) throw new NotFoundException('Submission cycle not found');
    if (cycle.closesAt < new Date()) throw new BadRequestException('This submission cycle has closed');

    return this.prisma.ministrySubmission.upsert({
      where: { ministryId_cycleId: { ministryId: focalPoint.ministryId, cycleId: dto.cycleId } },
      update: {},
      create: { ministryId: focalPoint.ministryId, cycleId: dto.cycleId, submittedById: focalPointUserId },
    });
  }

  mySubmissions(focalPointUserId: string) {
    return this.prisma.ministrySubmission.findMany({
      where: { submittedById: focalPointUserId },
      include: { ministry: true, cycle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitForValidation(id: string, actorId: string) {
    const submission = await this.prisma.ministrySubmission.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    await this.auditLog.record({
      actorId,
      action: 'MINISTRY_SUBMISSION_SUBMITTED',
      entityType: 'MinistrySubmission',
      entityId: id,
    });
    return submission;
  }

  async validate(id: string, actorId: string) {
    const submission = await this.prisma.ministrySubmission.update({
      where: { id },
      data: { status: 'VALIDATED', validatedAt: new Date() },
    });
    await this.auditLog.record({
      actorId,
      action: 'MINISTRY_SUBMISSION_VALIDATED',
      entityType: 'MinistrySubmission',
      entityId: id,
    });
    return submission;
  }

  async annualReport(ministryId: string, cycleId: string) {
    const innovations = await this.prisma.innovation.findMany({
      where: { ministryId, ministryCycleId: cycleId },
      select: { id: true, titleEn: true, reviewStatus: true, developmentStage: true, categoryId: true },
    });

    const byStage: Record<string, number> = {};
    for (const innovation of innovations) {
      byStage[innovation.developmentStage] = (byStage[innovation.developmentStage] ?? 0) + 1;
    }

    return {
      ministryId,
      cycleId,
      totalSubmitted: innovations.length,
      byDevelopmentStage: byStage,
      innovations,
    };
  }

  async generateAnnualReport(ministryId: string, cycleId: string) {
    const stats = await this.annualReport(ministryId, cycleId);
    return this.prisma.ministryAnnualReport.create({
      data: { cycleId, stats: stats as any },
    });
  }
}
