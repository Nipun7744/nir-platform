import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuditLogService } from '../common/services/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipantsService } from './participants.service';
import { BulkMessagesService } from './bulk-messages.service';
import {
  ComposeMessageDto,
  ExportDto,
  HistoryDto,
  ParticipantListDto,
  RecipientListDto,
  SendBulkMessageDto,
  SendOtpForBulkDto,
} from './dto/outreach.dto';

/**
 * Admin "Participants & messaging" (2026-11-18): challenge participant export (.xlsx) and bulk
 * email/SMS with admin OTP confirmation. Platform + System admins only (same as submission
 * monitoring). See docs/API.md § Outreach.
 */
@Controller('admin/outreach')
@UseGuards(RolesGuard)
@Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
export class OutreachController {
  constructor(
    private readonly participants: ParticipantsService,
    private readonly bulk: BulkMessagesService,
    private readonly auditLog: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('config')
  config(@CurrentUser() user: AuthenticatedUser) {
    return this.bulk.config(user.id);
  }

  @Get('challenges')
  challenges() {
    return this.participants.listChallenges();
  }

  @Get('challenges/:id/participants')
  list(@Param('id') id: string, @Query() q: ParticipantListDto) {
    return this.participants.listParticipants(id, q.q, q.page, q.pageSize);
  }

  /** The participant workbook. Every download is audit-logged (personal data leaving the system). */
  @Get('challenges/:id/participants/export')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async export(@Param('id') id: string, @Query() q: ExportDto, @CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    const admin = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { fullName: true, email: true } });
    const file = await this.participants.exportWorkbook(id, q.lang ?? 'en', `${admin.fullName} <${admin.email}>`);
    await this.auditLog.record({
      actorId: user.id,
      action: 'CHALLENGE_PARTICIPANTS_EXPORTED',
      entityType: 'Challenge',
      entityId: id,
      metadata: { participants: file.participantCount, submissions: file.submissionCount, lang: q.lang ?? 'en' },
      ipAddress: ip,
    });
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.filename}"`,
      length: file.buffer.length,
    });
  }

  @Post('messages/preview')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  preview(@Body() dto: ComposeMessageDto) {
    return this.bulk.preview(dto);
  }

  /** Sends a confirmation code to the signed-in admin's own email/phone. */
  @Post('messages/otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendOtp(@Body() dto: SendOtpForBulkDto, @CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.bulk.sendConfirmationCode(dto, { id: user.id, ip });
  }

  @Post('messages')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  send(@Body() dto: SendBulkMessageDto, @CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.bulk.send(dto, { id: user.id, ip });
  }

  @Get('messages')
  history(@Query() q: HistoryDto) {
    return this.bulk.history(q);
  }

  @Get('messages/:id')
  detail(@Param('id') id: string, @Query() q: RecipientListDto) {
    return this.bulk.detail(id, q);
  }
}
