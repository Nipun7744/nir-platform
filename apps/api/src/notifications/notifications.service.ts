import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notification dispatch (SRS FR-C4.M1.03 / FR-C4.M2.04).
 *
 * MOCKED integration point: real SMS/Email gateways are Bangladesh-government
 * or telecom-operator systems this environment has no credentials for. This
 * service defines the stable interface the rest of the app calls; swap the
 * `deliver()` method's body for a real provider (SMTP/SES for email, an SMS
 * aggregator for OTP/alerts) without touching any caller.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private renderTemplate(body: string, payload: Record<string, unknown>): string {
    return body.replace(/{{\s*(\w+)\s*}}/g, (_, key) => String(payload[key] ?? ''));
  }

  async send(params: {
    userId: string;
    templateCode: string;
    channel: NotificationChannel;
    payload?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        channel: params.channel,
        templateCode: params.templateCode,
        payload: (params.payload ?? {}) as any,
        status: 'QUEUED',
      },
    });

    try {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { code: params.templateCode },
      });
      const rendered = template
        ? this.renderTemplate(template.bodyEn, params.payload ?? {})
        : `[${params.templateCode}]`;

      await this.deliver(params.channel, rendered);

      return this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Notification ${notification.id} failed`, error as Error);
      return this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
    }
  }

  /** MOCK — replace with a real SMTP/SMS gateway call. */
  private async deliver(channel: NotificationChannel, body: string): Promise<void> {
    this.logger.log(`[MOCK ${channel}] ${body}`);
  }
}
