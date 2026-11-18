import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BulkMessage, MessageChannel, OtpChannel, OtpPurpose, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { MailService } from '../messaging/mail.service';
import { SmsService } from '../messaging/sms.service';
import { OtpService } from '../auth/otp.service';
import { readIntEnv } from '../common/utils/env-choice';
import { maskEmail, maskPhone, normalizeBdMobile } from '../common/utils/phone';
import { ParticipantsService, type Participant } from './participants.service';
import { renderBulkEmail } from './bulk-email';
import {
  LIMITS,
  PLACEHOLDERS,
  checkAddress,
  renderPlaceholders,
  smsSegments,
  unknownPlaceholders,
  type PlaceholderValues,
} from './message-template';
import type { ComposeMessageDto, HistoryDto, RecipientListDto, SendBulkMessageDto, SendOtpForBulkDto } from './dto/outreach.dto';

const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Stop a run after this many failures in a row — the transport is down; don't hammer it. */
const MAX_CONSECUTIVE_FAILURES = 10;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Actor {
  id: string;
  ip?: string;
}

/**
 * Admin bulk email/SMS to one challenge's participants.
 *
 * Send flow (all checks server-side): compose → preview (audience + sample) → the admin requests a
 * confirmation code to their OWN email/phone (OtpService, purpose BULK_MESSAGE_CONFIRM) → send with
 * the code. `send` then: validates content → returns the existing job for a replayed `requestKey`
 * → refuses while a send to the same challenge+channel is still running → refuses the same content
 * to the same challenge within 24 h unless `allowRepeat` → consumes the code → snapshots the
 * de-duplicated recipients (invalid/missing addresses recorded as SKIPPED) → queues the job.
 *
 * Delivery runs in this process (single API instance, like the rest of the app): one job at a
 * time, recipients in batches, paced to BULK_EMAIL_PER_MINUTE / BULK_SMS_PER_MINUTE. Jobs left
 * QUEUED/SENDING by a restart resume on boot (only still-PENDING recipients are sent).
 */
@Injectable()
export class BulkMessagesService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BulkMessagesService.name);
  private readonly emailPerMinute: number;
  private readonly smsPerMinute: number;
  private readonly batchSize: number;
  readonly maxRecipients: number;
  private running = false;
  private stopping = false;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly otp: OtpService,
    private readonly participants: ParticipantsService,
  ) {
    this.emailPerMinute = readIntEnv(config, 'BULK_EMAIL_PER_MINUTE', 60, 1);
    this.smsPerMinute = readIntEnv(config, 'BULK_SMS_PER_MINUTE', 120, 1);
    this.batchSize = readIntEnv(config, 'BULK_BATCH_SIZE', 25, 1);
    this.maxRecipients = readIntEnv(config, 'BULK_MAX_RECIPIENTS', 2000, 1);
  }

  onApplicationBootstrap() {
    // Resume anything a restart interrupted.
    this.kick();
  }

  onModuleDestroy() {
    this.stopping = true;
  }

  // -------------------------------------------------------------------------------- config

  async config(adminId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { email: true, phone: true } });
    const phone = normalizeBdMobile(admin?.phone);
    const otpChannels: OtpChannel[] = [];
    if (this.otp.isChannelEnabled(OtpChannel.EMAIL)) otpChannels.push(OtpChannel.EMAIL);
    if (phone && this.otp.isChannelEnabled(OtpChannel.SMS)) otpChannels.push(OtpChannel.SMS);
    return {
      channels: { EMAIL: true, SMS: this.sms.bulkAvailable },
      placeholders: PLACEHOLDERS,
      limits: { ...LIMITS, maxRecipients: this.maxRecipients },
      rate: { emailPerMinute: this.emailPerMinute, smsPerMinute: this.smsPerMinute },
      otp: {
        channels: otpChannels,
        targets: {
          EMAIL: admin ? maskEmail(admin.email.toLowerCase()) : null,
          SMS: phone ? maskPhone(phone) : null,
        },
        ttlSeconds: this.otp.ttlSeconds,
        resendSeconds: this.otp.resendSeconds,
      },
    };
  }

  // ------------------------------------------------------------------------------- compose

  private contentHash(dto: ComposeMessageDto) {
    const subject = dto.channel === MessageChannel.EMAIL ? (dto.subject ?? '').trim() : '';
    return createHash('sha256').update(`${dto.channel}\n${subject}\n${dto.body.trim()}`).digest('hex');
  }

  private validateContent(dto: ComposeMessageDto) {
    if (dto.channel === MessageChannel.SMS) {
      if (!this.sms.bulkAvailable) {
        throw new BadRequestException('Bulk SMS is not configured on this server (SMS_TELETALK_BULK_SMS_CLASS).');
      }
      if (dto.body.length > LIMITS.smsBodyMax) {
        throw new BadRequestException(`An SMS can be at most ${LIMITS.smsBodyMax} characters.`);
      }
    }
    if (dto.channel === MessageChannel.EMAIL && !dto.subject?.trim()) throw new BadRequestException('Enter a subject');
    if (!dto.body.trim()) throw new BadRequestException('Enter a message');
    const unknown = unknownPlaceholders(`${dto.subject ?? ''}\n${dto.body}`);
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown placeholder${unknown.length > 1 ? 's' : ''}: ${unknown.map((u) => `{{${u}}}`).join(', ')}. Available: ${PLACEHOLDERS.map((p) => `{{${p}}}`).join(', ')}.`,
      );
    }
  }

  private values(p: Pick<Participant, 'fullName' | 'irn' | 'locale'>, challenge: { titleEn: string; titleBn: string | null }): PlaceholderValues {
    return {
      name: p.fullName,
      challenge: p.locale === 'bn' && challenge.titleBn ? challenge.titleBn : challenge.titleEn,
      irn: p.irn ?? '',
    };
  }

  /** Who would receive it (deliverable vs skipped, with reasons) + a sample rendered for the first one. */
  async preview(dto: ComposeMessageDto) {
    this.validateContent(dto);
    const challenge = await this.participants.getChallenge(dto.challengeId);
    const audience = await this.audience(dto.challengeId, dto.channel);
    const sampleOf = audience.deliverable[0] ?? audience.skipped[0];
    const sample = sampleOf
      ? (() => {
          const v = this.values(sampleOf, challenge);
          const body = renderPlaceholders(dto.body, v);
          return {
            recipientName: sampleOf.fullName,
            locale: sampleOf.locale,
            subject: dto.channel === MessageChannel.EMAIL ? renderPlaceholders(dto.subject ?? '', v) : null,
            body,
            sms: dto.channel === MessageChannel.SMS ? smsSegments(body) : null,
          };
        })()
      : null;
    if (sample?.sms && sample.sms.segments > LIMITS.smsMaxSegments) {
      throw new BadRequestException(`This SMS would be ${sample.sms.segments} parts long; keep it within ${LIMITS.smsMaxSegments}.`);
    }
    const duplicate = await this.findRecentDuplicate(dto);
    return {
      challenge,
      channel: dto.channel,
      totalParticipants: audience.total,
      recipientCount: audience.deliverable.length,
      skippedCount: audience.skipped.length,
      skipped: audience.skipped.map((s) => ({ name: s.fullName, address: s.rawAddress, reason: s.reason })),
      overLimit: audience.deliverable.length > this.maxRecipients,
      maxRecipients: this.maxRecipients,
      sample,
      duplicateOf: duplicate,
    };
  }

  private async audience(challengeId: string, channel: MessageChannel) {
    const all = await this.participants.getParticipants(challengeId);
    const deliverable: (Participant & { address: string })[] = [];
    const skipped: (Participant & { rawAddress: string; reason: string })[] = [];
    const seen = new Set<string>();
    for (const p of all) {
      if (!p.isActive) {
        skipped.push({ ...p, rawAddress: channel === 'EMAIL' ? p.email : p.phone ?? '', reason: 'Account inactive' });
        continue;
      }
      const check = checkAddress(channel, channel === 'EMAIL' ? p.email : p.phone);
      if (!check.ok) {
        skipped.push({ ...p, rawAddress: check.address, reason: check.reason });
      } else if (seen.has(check.address)) {
        // Two accounts can't share an email/phone today, but never message one address twice.
        skipped.push({ ...p, rawAddress: check.address, reason: 'Duplicate address' });
      } else {
        seen.add(check.address);
        deliverable.push({ ...p, address: check.address });
      }
    }
    return { total: all.length, deliverable, skipped };
  }

  private async findRecentDuplicate(dto: ComposeMessageDto) {
    const hit = await this.prisma.bulkMessage.findFirst({
      where: {
        challengeId: dto.challengeId,
        channel: dto.channel,
        contentHash: this.contentHash(dto),
        status: { not: 'FAILED' },
        createdAt: { gte: new Date(Date.now() - REPEAT_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, sentCount: true, createdBy: { select: { fullName: true } } },
    });
    return hit ? { id: hit.id, createdAt: hit.createdAt, sentCount: hit.sentCount, createdBy: hit.createdBy.fullName } : null;
  }

  // ------------------------------------------------------------------------- confirmation

  private async adminTarget(adminId: string, channel: OtpChannel) {
    if (!this.otp.isChannelEnabled(channel)) {
      throw new BadRequestException(`Verification by ${channel === 'SMS' ? 'SMS' : 'email'} is not available.`);
    }
    const admin = await this.prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { email: true, phone: true } });
    if (channel === OtpChannel.EMAIL) return admin.email.trim().toLowerCase();
    const phone = normalizeBdMobile(admin.phone);
    if (!phone) throw new BadRequestException('Your account has no valid mobile number. Use email to receive the code.');
    return phone;
  }

  /** Sends a confirmation code to the admin's own email/phone. Normal OTP limits apply. */
  async sendConfirmationCode(dto: SendOtpForBulkDto, actor: Actor) {
    const channel = dto.otpChannel ?? OtpChannel.EMAIL;
    const target = await this.adminTarget(actor.id, channel);
    const sent = await this.otp.send({
      purpose: OtpPurpose.BULK_MESSAGE_CONFIRM,
      channel,
      target,
      locale: dto.locale ?? 'en',
      ip: actor.ip,
    });
    await this.auditLog.record({
      actorId: actor.id,
      action: 'BULK_MESSAGE_OTP_SENT',
      entityType: 'User',
      entityId: actor.id,
      metadata: { otpChannel: channel },
      ipAddress: actor.ip,
    });
    return sent;
  }

  // ---------------------------------------------------------------------------------- send

  async send(dto: SendBulkMessageDto, actor: Actor) {
    this.validateContent(dto);

    // 1. A replay of a request that already went through (double click, retry) → the same job.
    const replay = await this.prisma.bulkMessage.findUnique({ where: { requestKey: dto.requestKey } });
    if (replay) {
      if (replay.createdById !== actor.id) throw new ConflictException('This request key was already used.');
      return { ...(await this.summary(replay.id)), replayed: true };
    }

    const challenge = await this.participants.getChallenge(dto.challengeId);

    // 2. One running send per challenge + channel.
    const active = await this.prisma.bulkMessage.findFirst({
      where: { challengeId: dto.challengeId, channel: dto.channel, status: { in: ['QUEUED', 'SENDING'] } },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException({
        statusCode: 409,
        message: 'A bulk message to this challenge is still being sent. Wait for it to finish.',
        activeId: active.id,
      });
    }

    // 3. Same content to the same challenge in the last 24 h → only with an explicit override.
    const duplicate = await this.findRecentDuplicate(dto);
    if (duplicate && !dto.allowRepeat) {
      await this.auditLog.record({
        actorId: actor.id,
        action: 'BULK_MESSAGE_BLOCKED_DUPLICATE',
        entityType: 'Challenge',
        entityId: dto.challengeId,
        metadata: { channel: dto.channel, duplicateOf: duplicate.id },
        ipAddress: actor.ip,
      });
      throw new ConflictException({
        statusCode: 409,
        message: 'This exact message was already sent to this challenge in the last 24 hours.',
        duplicateOf: duplicate,
      });
    }

    const audience = await this.audience(dto.challengeId, dto.channel);
    if (!audience.deliverable.length) throw new BadRequestException('None of this challenge’s participants can receive this message.');
    if (audience.deliverable.length > this.maxRecipients) {
      throw new BadRequestException(`At most ${this.maxRecipients} recipients per send (this one has ${audience.deliverable.length}).`);
    }

    // 4. The admin's confirmation code — checked last, so a refused send doesn't burn it.
    await this.otp.verifyAndConsume({
      purpose: OtpPurpose.BULK_MESSAGE_CONFIRM,
      channel: dto.otpChannel,
      target: await this.adminTarget(actor.id, dto.otpChannel),
      code: dto.otpCode,
    });

    // 5. Snapshot recipients and queue. requestKey is unique, so a racing replay fails here.
    let job: BulkMessage;
    try {
      job = await this.prisma.bulkMessage.create({
        data: {
          channel: dto.channel,
          challengeId: challenge.id,
          challengeTitleEn: challenge.titleEn,
          subject: dto.channel === MessageChannel.EMAIL ? dto.subject!.trim() : null,
          body: dto.body.trim(),
          contentHash: this.contentHash(dto),
          requestKey: dto.requestKey,
          totalRecipients: audience.deliverable.length + audience.skipped.length,
          skippedCount: audience.skipped.length,
          createdById: actor.id,
          recipients: {
            createMany: {
              data: [
                ...audience.deliverable.map((p) => ({ userId: p.userId, name: p.fullName, address: p.address, locale: p.locale })),
                ...audience.skipped.map((p) => ({
                  userId: p.userId,
                  name: p.fullName,
                  address: p.rawAddress,
                  locale: p.locale,
                  status: 'SKIPPED' as const,
                  error: p.reason,
                })),
              ],
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.bulkMessage.findUniqueOrThrow({ where: { requestKey: dto.requestKey } });
        return { ...(await this.summary(existing.id)), replayed: true };
      }
      throw e;
    }

    await this.auditLog.record({
      actorId: actor.id,
      action: 'BULK_MESSAGE_QUEUED',
      entityType: 'BulkMessage',
      entityId: job.id,
      metadata: {
        challengeId: challenge.id,
        channel: dto.channel,
        recipients: audience.deliverable.length,
        skipped: audience.skipped.length,
        repeatOf: duplicate?.id,
      },
      ipAddress: actor.ip,
    });
    this.kick();
    return { ...(await this.summary(job.id)), replayed: false };
  }

  // -------------------------------------------------------------------------------- worker

  private kick() {
    if (this.running || this.stopping) return;
    this.running = true;
    void this.loop()
      .catch((e) => this.logger.error('Bulk message worker stopped', e as Error))
      .finally(() => {
        this.running = false;
      });
  }

  private async loop() {
    for (;;) {
      if (this.stopping) return;
      const job = await this.prisma.bulkMessage.findFirst({
        where: { status: { in: ['QUEUED', 'SENDING'] } },
        orderBy: { createdAt: 'asc' },
      });
      if (!job) return;
      await this.process(job);
    }
  }

  private async process(job: BulkMessage) {
    if (job.status === 'QUEUED') {
      await this.prisma.bulkMessage.update({ where: { id: job.id }, data: { status: 'SENDING', startedAt: new Date() } });
    }
    const challenge = job.challengeId
      ? await this.prisma.challenge.findUnique({ where: { id: job.challengeId }, select: { titleEn: true, titleBn: true } })
      : null;
    const titles = challenge ?? { titleEn: job.challengeTitleEn, titleBn: null };
    const irnByUser = new Map<string, string>();
    const delayMs = Math.ceil(60_000 / (job.channel === 'EMAIL' ? this.emailPerMinute : this.smsPerMinute));
    let consecutiveFailures = 0;

    for (;;) {
      if (this.stopping) return; // resumes on next boot
      const batch = await this.prisma.bulkMessageRecipient.findMany({
        where: { bulkMessageId: job.id, status: 'PENDING' },
        take: this.batchSize,
        orderBy: { id: 'asc' },
      });
      if (!batch.length) break;

      const missing = batch.map((r) => r.userId).filter((id): id is string => Boolean(id) && !irnByUser.has(id!));
      if (missing.length) {
        const profiles = await this.prisma.innovator.findMany({ where: { userId: { in: missing } }, select: { userId: true, irn: true } });
        for (const p of profiles) irnByUser.set(p.userId, p.irn);
      }

      for (const r of batch) {
        const v = this.values({ fullName: r.name, irn: r.userId ? irnByUser.get(r.userId) ?? null : null, locale: r.locale }, titles);
        try {
          if (job.channel === 'EMAIL') {
            await this.mail.send({
              to: r.address,
              ...renderBulkEmail({
                subject: renderPlaceholders(job.subject ?? '', v),
                body: renderPlaceholders(job.body, v),
                locale: r.locale === 'bn' ? 'bn' : 'en',
                challengeTitle: v.challenge,
              }),
            });
          } else {
            await this.sms.send(r.address, renderPlaceholders(job.body, v), 'bulk');
          }
          await this.prisma.bulkMessageRecipient.update({ where: { id: r.id }, data: { status: 'SENT', sentAt: new Date(), error: null } });
          consecutiveFailures = 0;
        } catch (e) {
          consecutiveFailures++;
          const message = (e as Error)?.message?.slice(0, 300) || 'Delivery failed';
          await this.prisma.bulkMessageRecipient.update({ where: { id: r.id }, data: { status: 'FAILED', error: message } });
          this.logger.warn(`Bulk ${job.channel} ${job.id}: delivery failed (${message})`);
        }
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          await this.prisma.bulkMessageRecipient.updateMany({
            where: { bulkMessageId: job.id, status: 'PENDING' },
            data: { status: 'FAILED', error: `Not attempted: stopped after ${MAX_CONSECUTIVE_FAILURES} failures in a row` },
          });
          break;
        }
        await sleep(delayMs);
      }
      await this.refreshCounts(job.id);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) break;
    }

    const counts = await this.refreshCounts(job.id);
    const status = counts.failed === 0 ? 'COMPLETED' : counts.sent === 0 ? 'FAILED' : 'COMPLETED_WITH_ERRORS';
    await this.prisma.bulkMessage.update({ where: { id: job.id }, data: { status, completedAt: new Date() } });
    await this.auditLog.record({
      actorId: job.createdById,
      action: 'BULK_MESSAGE_FINISHED',
      entityType: 'BulkMessage',
      entityId: job.id,
      metadata: { status, ...counts },
    });
    this.logger.log(`Bulk ${job.channel} ${job.id} finished: ${status} (sent ${counts.sent}, failed ${counts.failed}, skipped ${counts.skipped})`);
  }

  private async refreshCounts(id: string) {
    const groups = await this.prisma.bulkMessageRecipient.groupBy({ by: ['status'], where: { bulkMessageId: id }, _count: true });
    const get = (s: string) => groups.find((g) => g.status === s)?._count ?? 0;
    const counts = { sent: get('SENT'), failed: get('FAILED'), skipped: get('SKIPPED'), pending: get('PENDING') };
    await this.prisma.bulkMessage.update({
      where: { id },
      data: { sentCount: counts.sent, failedCount: counts.failed, skippedCount: counts.skipped },
    });
    return counts;
  }

  // ------------------------------------------------------------------------------- history

  private readonly summarySelect = {
    id: true,
    channel: true,
    challengeId: true,
    challengeTitleEn: true,
    subject: true,
    body: true,
    status: true,
    totalRecipients: true,
    sentCount: true,
    failedCount: true,
    skippedCount: true,
    createdAt: true,
    startedAt: true,
    completedAt: true,
    createdBy: { select: { id: true, fullName: true, email: true } },
  } satisfies Prisma.BulkMessageSelect;

  private async summary(id: string) {
    const m = await this.prisma.bulkMessage.findUniqueOrThrow({ where: { id }, select: this.summarySelect });
    const pending = m.totalRecipients - m.sentCount - m.failedCount - m.skippedCount;
    return { ...m, pendingCount: Math.max(0, pending) };
  }

  async history(dto: HistoryDto) {
    const where: Prisma.BulkMessageWhereInput = dto.challengeId ? { challengeId: dto.challengeId } : {};
    const pageSize = dto.pageSize ?? 20;
    const [total, items] = await Promise.all([
      this.prisma.bulkMessage.count({ where }),
      this.prisma.bulkMessage.findMany({
        where,
        select: this.summarySelect,
        orderBy: { createdAt: 'desc' },
        skip: ((dto.page ?? 1) - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page: dto.page ?? 1,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: items.map((m) => ({ ...m, pendingCount: Math.max(0, m.totalRecipients - m.sentCount - m.failedCount - m.skippedCount) })),
    };
  }

  async detail(id: string, dto: RecipientListDto) {
    const exists = await this.prisma.bulkMessage.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Bulk message not found');
    const where: Prisma.BulkMessageRecipientWhereInput = { bulkMessageId: id, ...(dto.status ? { status: dto.status } : {}) };
    const pageSize = dto.pageSize ?? 50;
    const [message, total, recipients] = await Promise.all([
      this.summary(id),
      this.prisma.bulkMessageRecipient.count({ where }),
      this.prisma.bulkMessageRecipient.findMany({
        where,
        // Enum order is PENDING, SENT, FAILED, SKIPPED → desc puts SKIPPED/FAILED (what the admin
        // needs to act on) first.
        orderBy: [{ status: 'desc' }, { name: 'asc' }],
        skip: ((dto.page ?? 1) - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, address: true, status: true, error: true, sentAt: true },
      }),
    ]);
    return {
      message,
      recipients: { total, page: dto.page ?? 1, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), items: recipients },
    };
  }
}
