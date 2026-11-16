import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpChannel, OtpPurpose, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
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
import { CaptchaService } from './captcha.service';
import { OTP_CODE_LENGTH, OtpService } from './otp.service';
import { bdMobileForms, normalizeBdMobile } from '../common/utils/phone';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
