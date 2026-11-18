import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../messaging/mail.service';
import { SmsService } from '../messaging/sms.service';
import { readIntEnv } from '../common/utils/env-choice';
import { maskEmail, maskPhone } from '../common/utils/phone';
import { renderOtpEmail } from '../messaging/templates/otp-email';

export const OTP_CODE_LENGTH = 6;

type Locale = 'en' | 'bn';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/**
 * One-time passcodes sent to an email address or phone number before an account
 * exists. Limits (all env-overridable): code valid OTP_TTL_SECONDS (300), one send
 * per target per OTP_RESEND_SECONDS (60), at most OTP_MAX_SENDS_PER_HOUR (5) per
 * target, OTP_MAX_ATTEMPTS (5) wrong guesses per code. Only an HMAC of the code is
 * stored (keyed by OTP_SECRET, falling back to JWT_ACCESS_SECRET).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  readonly ttlSeconds: number;
  readonly resendSeconds: number;
  private readonly maxSendsPerHour: number;
  private readonly maxAttempts: number;
  private readonly secret: string;
  readonly channels: OtpChannel[];

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {
    this.ttlSeconds = readIntEnv(config, 'OTP_TTL_SECONDS', 300, 60);
    this.resendSeconds = readIntEnv(config, 'OTP_RESEND_SECONDS', 60, 0);
    this.maxSendsPerHour = readIntEnv(config, 'OTP_MAX_SENDS_PER_HOUR', 5);
    this.maxAttempts = readIntEnv(config, 'OTP_MAX_ATTEMPTS', 5);
    this.secret = config.get<string>('OTP_SECRET') || config.getOrThrow<string>('JWT_ACCESS_SECRET');

    const raw = (config.get<string>('OTP_CHANNELS') ?? 'EMAIL,SMS')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    const invalid = raw.filter((c) => !(c in OtpChannel));
    if (invalid.length || raw.length === 0) {
      throw new Error(`OTP_CHANNELS must list EMAIL and/or SMS (got "${config.get('OTP_CHANNELS')}")`);
    }
    this.channels = [...new Set(raw)] as OtpChannel[];
  }

  private hash(target: string, code: string): string {
    return createHmac('sha256', this.secret).update(`${target}:${code}`).digest('hex');
  }

  isChannelEnabled(channel: OtpChannel): boolean {
    return this.channels.includes(channel);
  }

  /**
   * Generate, store and deliver a fresh code. Supersedes any earlier unconsumed code
   * for the same target. `target` must already be normalized (lower-case email /
   * E.164 phone).
   */
  async send(params: { purpose: OtpPurpose; channel: OtpChannel; target: string; locale: Locale; ip?: string }) {
    const { purpose, channel, target } = params;
    const now = Date.now();

    // Both limits are checked from one round-trip; the cooldown is still reported first.
    const [latest, sentLastHour] = await Promise.all([
      this.prisma.otpCode.findFirst({
        where: { target, purpose },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.otpCode.count({
        where: { target, purpose, createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
      }),
    ]);
    if (latest) {
      const wait = Math.ceil((latest.createdAt.getTime() + this.resendSeconds * 1000 - now) / 1000);
      if (wait > 0) {
        throw new HttpException(
          { statusCode: 429, message: `Please wait ${wait} seconds before requesting another code.`, retryAfterSeconds: wait },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    if (sentLastHour >= this.maxSendsPerHour) {
      throw new HttpException(
        'Too many verification codes were requested for this address. Please try again in an hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 10 ** OTP_CODE_LENGTH).toString().padStart(OTP_CODE_LENGTH, '0');
    const [, created] = await this.prisma.$transaction([
      this.prisma.otpCode.updateMany({
        where: { target, purpose, consumedAt: null },
        data: { consumedAt: new Date(now) },
      }),
      this.prisma.otpCode.create({
        data: {
          purpose,
          channel,
          target,
          codeHash: this.hash(target, code),
          expiresAt: new Date(now + this.ttlSeconds * 1000),
          requestIp: params.ip,
        },
      }),
    ]);

    try {
      await this.deliver(purpose, channel, target, code, params.locale);
    } catch (error) {
      // Retire the undeliverable code so it neither works nor blocks a retry via the cooldown.
      await this.prisma.otpCode.delete({ where: { id: created.id } }).catch(() => undefined);
      this.logger.error(`OTP delivery via ${channel} failed`, error as Error);
      throw new ServiceUnavailableException(
        channel === 'SMS'
          ? 'We could not send an SMS to that number right now. Please try again or verify by email.'
          : 'We could not send an email to that address right now. Please try again or verify by phone.',
      );
    }

    return {
      channel,
      sentTo: channel === 'EMAIL' ? maskEmail(target) : maskPhone(target),
      expiresInSeconds: this.ttlSeconds,
      resendInSeconds: this.resendSeconds,
    };
  }

  /** Check a code and mark it used. Throws 400 with a user-facing reason on any failure. */
  async verifyAndConsume(params: { purpose: OtpPurpose; channel: OtpChannel; target: string; code: string }) {
    const { purpose, channel, target, code } = params;
    const otp = await this.prisma.otpCode.findFirst({
      where: { target, purpose, channel, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Your verification code has expired or was not requested. Please request a new code.');
    }

    // Count the attempt *before* comparing, atomically capped — parallel guesses can't exceed the limit.
    const counted = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: { lt: this.maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }

    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(this.hash(target, code.trim()), 'hex');
    if (!timingSafeEqual(expected, actual)) {
      const left = this.maxAttempts - (otp.attempts + 1);
      throw new BadRequestException(
        left > 0
          ? `Incorrect verification code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Please request a new code.',
      );
    }

    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new BadRequestException('This verification code has already been used. Please request a new code.');
    }
  }

  private async deliver(purpose: OtpPurpose, channel: OtpChannel, target: string, code: string, locale: Locale) {
    const minutes = Math.round(this.ttlSeconds / 60);
    const reset = purpose === OtpPurpose.PASSWORD_RESET;
    if (channel === 'SMS') {
      // Teletalk's OTP class rejects messages over 70 *UTF-8 bytes* (measured 2026-11-12: 66 bytes
      // OK, 72 rejected with scode 51). A Bangla letter is 3 bytes, so the Bangla text must stay
      // tiny: this one is 66 bytes (69 with a two-digit minute count) and has no room to say what
      // the code is for. The English ones are 60 (registration) and 58 (password reset) bytes. The
      // code stays in ASCII digits even in Bangla, because the code box only accepts 0-9 and
      // phones only autofill ASCII-digit codes.
      const text =
        locale === 'bn'
          ? `NIR কোড: ${code}। মেয়াদ ${toBnDigits(String(minutes))} মিনিট।`
          : reset
            ? `NIR password reset code: ${code}. Valid ${minutes} min. Don't share.`
            : `NIR verification code: ${code}. Valid ${minutes} min. Do not share it.`;
      await this.sms.send(target, text);
      return;
    }

    // Every email code (any purpose, en/bn) uses the one branded template — messaging/templates/otp-email.ts.
    const email = renderOtpEmail({ purpose, code, minutes, locale });
    await this.mail.send({ to: target, ...email });
  }
}
