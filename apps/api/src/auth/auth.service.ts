import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpChannel, OtpPurpose, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IdGeneratorService } from '../common/services/id-generator.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FundingService } from '../funding/funding.service';
import { MentorshipService } from '../mentorship/mentorship.service';
import { MinistriesService } from '../ministries/ministries.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { ResetPasswordDto, VerifyResetCodeDto } from './dto/password-reset.dto';
import { CaptchaService } from './captcha.service';
import { OTP_CODE_LENGTH, OtpService } from './otp.service';
import { bdMobileForms, normalizeBdMobile } from '../common/utils/phone';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** How long the user has to choose a new password after the reset code is verified. */
const RESET_TOKEN_TTL_SECONDS = 10 * 60;
const RESET_TOKEN_TYPE = 'password-reset';

interface ResetTokenPayload {
  sub: string;
  typ: typeof RESET_TOKEN_TYPE;
  /** Channel the code was verified on — that email/phone is marked verified on success. */
  ch: OtpChannel;
  /** Fingerprint of the password hash at issue time: the token dies once the password changes. */
  pwv: string;
}

/** Whether a registrant may also pick Investor / Mentor / Ministry Focal Point (off since 2026-11-16). */
const SELF_SERVICE_ROLES_AT_SIGNUP = false;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly idGenerator: IdGeneratorService,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly funding: FundingService,
    private readonly mentorship: MentorshipService,
    private readonly ministries: MinistriesService,
    private readonly captcha: CaptchaService,
    private readonly otp: OtpService,
  ) {}

  /** Public settings the sign-in/register pages need (no secrets). */
  securityConfig() {
    return {
      captcha: { provider: this.captcha.provider, siteKey: this.captcha.siteKey },
      otp: {
        channels: this.otp.channels,
        codeLength: OTP_CODE_LENGTH,
        ttlSeconds: this.otp.ttlSeconds,
        resendSeconds: this.otp.resendSeconds,
      },
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private requirePhone(phone: string | undefined): string {
    const normalized = normalizeBdMobile(phone);
    if (!normalized) throw new BadRequestException('Enter a valid Bangladeshi mobile number (e.g. 01712345678).');
    return normalized;
  }

  /** Phones stored before normalization was introduced may be in any of these shapes. */
  private async phoneTaken(e164: string): Promise<boolean> {
    const f = bdMobileForms(e164);
    const hit = await this.prisma.user.findFirst({
      where: { phone: { in: [f.e164, f.international, f.local] } },
      select: { id: true },
    });
    return Boolean(hit);
  }

  /** Step 1 of registration: send a code to the email address or phone the user will verify. */
  async sendRegistrationOtp(dto: SendOtpDto, ip?: string) {
    if (!this.otp.isChannelEnabled(dto.channel)) {
      throw new BadRequestException(`Verification by ${dto.channel === 'SMS' ? 'SMS' : 'email'} is not available.`);
    }
    // CAPTCHA first — every send costs an email/SMS, and the checks below reveal whether an account exists.
    await this.captcha.verify(dto.captchaToken, ip);

    let target: string;
    if (dto.channel === OtpChannel.EMAIL) {
      const email = dto.email!.trim();
      if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new ConflictException('An account with this email already exists');
      }
      target = this.normalizeEmail(email);
    } else {
      target = this.requirePhone(dto.phone);
      if (await this.phoneTaken(target)) {
        throw new ConflictException('An account with this phone number already exists');
      }
    }

    return this.otp.send({
      purpose: OtpPurpose.REGISTRATION,
      channel: dto.channel,
      target,
      locale: dto.locale ?? 'en',
      ip,
    });
  }

  // ------------------------------------------------------------------ forgot password (3 steps)

  /**
   * The account a reset code may be sent to / checked against, plus the normalized OTP target.
   * Says plainly when no account matches: registration (also CAPTCHA-gated) already reveals
   * whether an email/phone is registered, so hiding it here would cost clarity and protect nothing.
   */
  private async findResetAccount(channel: OtpChannel, email?: string, phone?: string) {
    if (!this.otp.isChannelEnabled(channel)) {
      throw new BadRequestException(`Verification by ${channel === 'SMS' ? 'SMS' : 'email'} is not available.`);
    }
    let target: string;
    let user: { id: string; passwordHash: string; isActive: boolean } | null;
    const select = { id: true, passwordHash: true, isActive: true } as const;
    if (channel === OtpChannel.EMAIL) {
      target = this.normalizeEmail(email ?? '');
      // Emails are stored as typed at registration, so match case-insensitively.
      user = await this.prisma.user.findFirst({ where: { email: { equals: target, mode: 'insensitive' } }, select });
      if (!user) throw new NotFoundException('No account is registered with this email address.');
    } else {
      target = this.requirePhone(phone);
      const f = bdMobileForms(target);
      user = await this.prisma.user.findFirst({ where: { phone: { in: [f.e164, f.international, f.local] } }, select });
      if (!user) throw new NotFoundException('No account is registered with this mobile number.');
    }
    if (!user.isActive) {
      throw new ForbiddenException('This account is not active, so its password cannot be reset. Please contact the platform administrator.');
    }
    return { user, target };
  }

  /** Separate key from access tokens, so a reset token can never pass JwtStrategy (and vice versa). */
  private resetTokenSecret(): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_ACCESS_SECRET')).update('nir:password-reset').digest('hex');
  }

  private passwordFingerprint(passwordHash: string): string {
    return createHash('sha256').update(passwordHash).digest('hex').slice(0, 32);
  }

  /** Step 1: email/SMS a reset code to a registered account. Same limits as registration codes. */
  async sendPasswordResetOtp(dto: SendOtpDto, ip?: string) {
    // CAPTCHA first — every send costs an email/SMS, and the lookup reveals whether an account exists.
    await this.captcha.verify(dto.captchaToken, ip);
    const { target } = await this.findResetAccount(dto.channel, dto.email, dto.phone);
    return this.otp.send({
      purpose: OtpPurpose.PASSWORD_RESET,
      channel: dto.channel,
      target,
      locale: dto.locale ?? 'en',
      ip,
    });
  }

  /** Step 2: check the code; on success return a short-lived, single-use token for step 3. */
  async verifyPasswordResetOtp(dto: VerifyResetCodeDto) {
    const { user, target } = await this.findResetAccount(dto.channel, dto.email, dto.phone);
    await this.otp.verifyAndConsume({ purpose: OtpPurpose.PASSWORD_RESET, channel: dto.channel, target, code: dto.code });
    const payload: ResetTokenPayload = {
      sub: user.id,
      typ: RESET_TOKEN_TYPE,
      ch: dto.channel,
      pwv: this.passwordFingerprint(user.passwordHash),
    };
    const resetToken = await this.jwt.signAsync(payload, { secret: this.resetTokenSecret(), expiresIn: RESET_TOKEN_TTL_SECONDS });
    return { resetToken, expiresInSeconds: RESET_TOKEN_TTL_SECONDS };
  }

  /** Step 3: set the new password, then sign the account out everywhere. */
  async resetPassword(dto: ResetPasswordDto, ip?: string) {
    const expired = () =>
      new BadRequestException('Your password reset session has expired or was already used. Please start again.');
    let payload: ResetTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<ResetTokenPayload>(dto.resetToken, { secret: this.resetTokenSecret() });
    } catch {
      throw expired();
    }
    if (payload.typ !== RESET_TOKEN_TYPE) throw expired();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    // Fingerprint mismatch = the password already changed since the code was verified (token reuse).
    if (!user || this.passwordFingerprint(user.passwordHash) !== payload.pwv) throw expired();
    if (!user.isActive) {
      throw new ForbiddenException('This account is not active, so its password cannot be reset. Please contact the platform administrator.');
    }

    if (dto.password !== dto.confirmPassword) throw new BadRequestException('Passwords do not match.');
    if (await argon2.verify(user.passwordHash, dto.password)) {
      throw new BadRequestException('Your new password must be different from your current password.');
    }

    const now = new Date();
    const passwordHash = await argon2.hash(dto.password);
    // Conditional on the old hash, so two concurrent submissions of the same token can't both win.
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { id: user.id, passwordHash: user.passwordHash },
        data: {
          passwordHash,
          // The reset code proved control of this email / phone.
          ...(payload.ch === OtpChannel.EMAIL && !user.emailVerifiedAt ? { emailVerifiedAt: now } : {}),
          ...(payload.ch === OtpChannel.SMS && !user.phoneVerifiedAt ? { phoneVerifiedAt: now } : {}),
        },
      }),
      // Signed out everywhere: every existing session ends with the old password.
      this.prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    if (updated.count === 0) throw expired();

    await this.auditLog.record({
      actorId: user.id,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      metadata: { verifiedBy: payload.ch, ip },
    });
    return { success: true, message: 'Your password has been reset. You can now sign in with your new password.' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokenPair(user: { id: string; email: string; roles: Role[] }): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, roles: user.roles },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    // 2026-11-16: every new account is an Innovation Submitter only. Investor / Mentor / Ministry
    // Focal Point can no longer be self-selected at sign-up (the form shows the role as fixed);
    // flip SELF_SERVICE_ROLES_AT_SIGNUP to restore the old dropdown behaviour.
    if (dto.role && !SELF_SERVICE_ROLES_AT_SIGNUP) {
      throw new BadRequestException('New accounts are registered as Innovation Submitter only.');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    // A phone is optional, but if given it's stored normalized (+8801XXXXXXXXX) and must be unique.
    const phone = dto.phone ? this.requirePhone(dto.phone) : undefined;
    if (dto.otpChannel === OtpChannel.SMS && !phone) {
      throw new BadRequestException('A phone number is required to verify by SMS.');
    }
    if (phone && (await this.phoneTaken(phone))) {
      throw new ConflictException('An account with this phone number already exists');
    }

    // Step 2 of registration: the code sent by sendRegistrationOtp() must match before anything is created.
    await this.otp.verifyAndConsume({
      purpose: OtpPurpose.REGISTRATION,
      channel: dto.otpChannel,
      target: dto.otpChannel === OtpChannel.EMAIL ? this.normalizeEmail(dto.email) : phone!,
      code: dto.otpCode,
    });
    const verifiedAt = new Date();

    const passwordHash = await argon2.hash(dto.password);
    const irn = await this.idGenerator.nextIrn();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone,
        emailVerifiedAt: dto.otpChannel === OtpChannel.EMAIL ? verifiedAt : undefined,
        phoneVerifiedAt: dto.otpChannel === OtpChannel.SMS ? verifiedAt : undefined,
        passwordHash,
        fullName: dto.fullName,
        roles: [Role.INNOVATION_SUBMITTER],
        // Since 2026-11-15 a successful OTP verification (above) approves and activates the
        // account immediately; there is no admin approval step for self-registration any more.
        isActive: true,
        lastLoginAt: verifiedAt,
        innovatorProfile: { create: { irn } },
      },
    });

    // Layer on the desired self-service role now, while we still have a userId to
    // hand these services directly (same call, so the role is in place before the
    // first token is issued below).
    if (dto.role === Role.INVESTOR) {
      await this.funding.registerInvestor(user.id, {
        organizationName: dto.organizationName ?? '',
        binNumber: dto.binNumber,
        sectorInterestIds: dto.sectorInterestIds,
      });
    } else if (dto.role === Role.MENTOR) {
      await this.mentorship.registerMentor(user.id, {
        bio: dto.bio,
        availability: dto.availability,
        expertiseTagIds: dto.expertiseTagIds,
      });
    } else if (dto.role === Role.MINISTRY_FOCAL_POINT) {
      await this.ministries.registerFocalPoint(user.id, { ministryId: dto.ministryId ?? '', title: dto.title });
    }

    await this.auditLog.record({
      actorId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      metadata: { verifiedBy: dto.otpChannel, autoActivated: true },
    });

    await this.notifications.send({
      userId: user.id,
      templateCode: 'WELCOME',
      channel: 'EMAIL' as any,
      payload: { fullName: user.fullName, irn },
    });

    // Sign the new user straight in. Re-read so the token carries any role added above.
    const activeUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const tokens = await this.issueTokenPair(activeUser);
    return {
      pending: false,
      message: 'Your account is verified and active.',
      user: this.toPublicUser(activeUser),
      ...tokens,
    };
  }

  async login(dto: LoginDto, ip?: string) {
    // Every attempt, before touching the account — so credential stuffing can't skip it.
    await this.captcha.verify(dto.captchaToken, ip);

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) {
      if (user.rejectedAt) {
        throw new ForbiddenException('Your registration was not approved. Please contact the platform administrator.');
      }
      throw new ForbiddenException('Your account is pending administrator approval.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.auditLog.record({ actorId: user.id, action: 'USER_LOGIN', entityType: 'User', entityId: user.id });

    const tokens = await this.issueTokenPair(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    // Rotate: revoke the used token, issue a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokenPair(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    fullName: string;
    roles: Role[];
    locale: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      locale: user.locale,
    };
  }
}
