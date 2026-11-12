import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { readEnvChoice, readIntEnv, requireEnv } from '../common/utils/env-choice';

export const MAIL_TRANSPORTS = ['smtp', 'console'] as const;
export type MailTransportKind = (typeof MAIL_TRANSPORTS)[number];

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Outbound email. `MAIL_TRANSPORT=smtp` sends through any SMTP server (a2i/government
 * mail relay, Amazon SES SMTP, SendGrid/Mailgun/Brevo SMTP, Google Workspace…);
 * `console` (the dev default) only writes the message to the API log.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  readonly kind: MailTransportKind;
  private readonly from: string;
  private readonly replyTo?: string;
  private readonly transporter?: nodemailer.Transporter;

  constructor(config: ConfigService) {
    this.kind = readEnvChoice(config, 'MAIL_TRANSPORT', MAIL_TRANSPORTS, 'console');
    this.from = config.get<string>('MAIL_FROM')?.trim() || 'NIR Platform <no-reply@localhost>';
    this.replyTo = config.get<string>('MAIL_REPLY_TO')?.trim() || undefined;

    if (this.kind === 'smtp') {
      const host = requireEnv(config, 'SMTP_HOST', 'when MAIL_TRANSPORT=smtp');
      requireEnv(config, 'MAIL_FROM', 'when MAIL_TRANSPORT=smtp');
      const port = readIntEnv(config, 'SMTP_PORT', 587);
      const user = config.get<string>('SMTP_USER')?.trim();
      // true = implicit TLS (port 465); false = plain connection upgraded with STARTTLS (587).
      const secure = (config.get<string>('SMTP_SECURE') ?? String(port === 465)).toLowerCase() === 'true';
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        // On a STARTTLS port, refuse to send credentials/codes if the server doesn't upgrade to TLS.
        // Only for an internal relay without TLS: SMTP_REQUIRE_TLS=false.
        requireTLS: !secure && (config.get<string>('SMTP_REQUIRE_TLS') ?? 'true').toLowerCase() !== 'false',
        auth: user ? { user, pass: config.get<string>('SMTP_PASS') ?? '' } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
    } else if (config.get<string>('NODE_ENV') === 'production') {
      this.logger.warn('MAIL_TRANSPORT=console in production — emails (including OTP codes) are only logged, never delivered.');
    }
  }

  async send(mail: OutgoingMail): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[console email] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, replyTo: this.replyTo, ...mail });
  }
}
