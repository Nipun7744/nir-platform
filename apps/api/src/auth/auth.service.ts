import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
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

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
  ) {}

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
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await argon2.hash(dto.password);
    const irn = await this.idGenerator.nextIrn();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        fullName: dto.fullName,
        roles: [Role.INNOVATION_SUBMITTER],
        isActive: false,
        innovatorProfile: { create: { irn } },
      },
    });

    // Layer on the desired self-service role now, while we still have a userId to
    // hand these services directly — the account isn't active yet, so it can't
    // authenticate to call the equivalent /register endpoints itself.
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
    });

    await this.notifications.send({
      userId: user.id,
      templateCode: 'WELCOME',
      channel: 'EMAIL' as any,
      payload: { fullName: user.fullName, irn },
    });

    return {
      pending: true,
      message:
        'Your registration has been submitted. An administrator will review and approve your account before you can sign in.',
    };
  }

  async login(dto: LoginDto) {
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
