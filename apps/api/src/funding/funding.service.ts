import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityVerificationService } from '../common/services/identity-verification.service';
import {
  RegisterInvestorDto,
  CreateEoiDto,
  UpdateEoiStatusDto,
  CreateFundingAgreementDto,
  CreateFundDisbursementDto,
  CreateReferralDto,
} from './dto/funding.dto';

@Injectable()
export class FundingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly identity: IdentityVerificationService,
  ) {}

  async registerInvestor(userId: string, dto: RegisterInvestorDto) {
    let binVerified = false;
    if (dto.binNumber) {
      const result = await this.identity.verifyBin(dto.binNumber);
      binVerified = result.verified;
    }

    const investor = await this.prisma.investor.upsert({
      where: { userId },
      update: { organizationName: dto.organizationName, binNumber: dto.binNumber, binVerified },
      create: {
        userId,
        organizationName: dto.organizationName,
        binNumber: dto.binNumber,
        binVerified,
        sectorInterestIds: dto.sectorInterestIds ?? [],
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.roles.includes(Role.INVESTOR)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { roles: { push: Role.INVESTOR } },
      });
    }

    return investor;
  }

  findDirectory(categoryId?: string) {
    return this.prisma.investor.findMany({
      where: categoryId ? { sectorInterestIds: { has: categoryId } } : undefined,
      select: {
        id: true,
        organizationName: true,
        binVerified: true,
        sectorInterestIds: true,
        user: { select: { fullName: true } },
      },
    });
  }

  async createEoi(investorUserId: string, dto: CreateEoiDto) {
    const investor = await this.prisma.investor.findUnique({ where: { userId: investorUserId } });
    if (!investor) throw new BadRequestException('Register as an investor before expressing interest');

    const innovation = await this.prisma.innovation.findUnique({ where: { id: dto.innovationId } });
    if (!innovation || innovation.reviewStatus !== 'PUBLISHED') {
      throw new BadRequestException('This innovation is not open for investment interest');
    }

    const eoi = await this.prisma.expressionOfInterest.create({
      data: { innovationId: dto.innovationId, investorId: investor.id, message: dto.message },
    });

    await this.notifications.send({
      userId: innovation.submittedById,
      templateCode: 'EOI_RECEIVED',
      channel: 'EMAIL' as any,
      payload: { innovationTitle: innovation.titleEn },
    });

    await this.auditLog.record({
      actorId: investorUserId,
      action: 'EOI_SUBMITTED',
      entityType: 'Innovation',
      entityId: dto.innovationId,
    });

    return eoi;
  }

  async createReferral(evaluatorId: string, dto: CreateReferralDto) {
    const innovation = await this.prisma.innovation.findUnique({ where: { id: dto.innovationId } });
    if (!innovation) throw new NotFoundException('Innovation not found');

    const investor = await this.prisma.investor.findUnique({ where: { id: dto.investorId } });
    if (!investor) throw new NotFoundException('Investor not found');

    const referral = await this.prisma.innovationReferral.upsert({
      where: { innovationId_investorId: { innovationId: dto.innovationId, investorId: dto.investorId } },
      update: { message: dto.message },
      create: {
        innovationId: dto.innovationId,
        investorId: dto.investorId,
        referredById: evaluatorId,
        message: dto.message,
      },
    });

    await this.notifications.send({
      userId: investor.userId,
      templateCode: 'INNOVATION_REFERRED',
      channel: 'EMAIL' as any,
      payload: { innovationTitle: innovation.titleEn },
    });

    await this.auditLog.record({
      actorId: evaluatorId,
      action: 'INNOVATION_REFERRED_TO_INVESTOR',
      entityType: 'Innovation',
      entityId: dto.innovationId,
      metadata: { investorId: dto.investorId },
    });

    return referral;
  }

  async myReferrals(investorUserId: string) {
    const investor = await this.prisma.investor.findUnique({ where: { userId: investorUserId } });
    if (!investor) return [];
    return this.prisma.innovationReferral.findMany({
      where: { investorId: investor.id },
      include: { innovation: { select: { id: true, slug: true, titleEn: true, innovationCode: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myEois(investorUserId: string) {
    const investor = await this.prisma.investor.findUnique({ where: { userId: investorUserId } });
    if (!investor) return [];
    return this.prisma.expressionOfInterest.findMany({
      where: { investorId: investor.id },
      include: { innovation: { select: { id: true, slug: true, titleEn: true, innovationCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async eoisForInnovation(innovationId: string) {
    return this.prisma.expressionOfInterest.findMany({
      where: { innovationId },
      include: { investor: { select: { organizationName: true, binVerified: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEoiStatus(id: string, dto: UpdateEoiStatusDto, actorId: string) {
    const eoi = await this.prisma.expressionOfInterest.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.auditLog.record({
      actorId,
      action: 'EOI_STATUS_UPDATED',
      entityType: 'ExpressionOfInterest',
      entityId: id,
      metadata: { status: dto.status },
    });
    return eoi;
  }

  async createAgreement(dto: CreateFundingAgreementDto, actorId: string) {
    const agreement = await this.prisma.fundingAgreement.create({
      data: {
        innovationId: dto.innovationId,
        investorId: dto.investorId,
        title: dto.title,
        documentUrl: dto.documentUrl,
        signedDate: dto.signedDate ? new Date(dto.signedDate) : undefined,
      },
    });
    await this.auditLog.record({
      actorId,
      action: 'FUNDING_AGREEMENT_ARCHIVED',
      entityType: 'Innovation',
      entityId: dto.innovationId,
    });
    return agreement;
  }

  async createDisbursement(dto: CreateFundDisbursementDto, actorId: string) {
    const disbursement = await this.prisma.fundDisbursement.create({
      data: {
        innovationId: dto.innovationId,
        amount: dto.amount,
        currency: dto.currency ?? 'BDT',
        source: dto.source,
        disbursedAt: new Date(dto.disbursedAt),
        note: dto.note,
        recordedById: actorId,
      },
    });
    await this.auditLog.record({
      actorId,
      action: 'FUND_DISBURSEMENT_RECORDED',
      entityType: 'Innovation',
      entityId: dto.innovationId,
      metadata: { amount: dto.amount, source: dto.source },
    });
    return disbursement;
  }

  async disbursementsForInnovation(innovationId: string) {
    return this.prisma.fundDisbursement.findMany({
      where: { innovationId },
      orderBy: { disbursedAt: 'desc' },
    });
  }
}
