import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../common/services/audit-log.service';
import {
  RegisterMentorDto,
  CreateMentorMatchDto,
  ProposeSessionDto,
  UpdateSessionStatusDto,
  SubmitMentorFeedbackDto,
  LogMentorActivityDto,
} from './dto/mentorship.dto';

@Injectable()
export class MentorshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registerMentor(userId: string, dto: RegisterMentorDto) {
    const mentor = await this.prisma.mentor.upsert({
      where: { userId },
      update: { bio: dto.bio, availability: dto.availability, expertiseTagIds: dto.expertiseTagIds ?? [] },
      create: {
        userId,
        bio: dto.bio,
        availability: dto.availability,
        expertiseTagIds: dto.expertiseTagIds ?? [],
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.roles.includes(Role.MENTOR)) {
      await this.prisma.user.update({ where: { id: userId }, data: { roles: { push: Role.MENTOR } } });
    }
    return mentor;
  }

  findDirectory(tagIds?: string[]) {
    return this.prisma.mentor.findMany({
      where: tagIds?.length ? { expertiseTagIds: { hasSome: tagIds } } : undefined,
      select: {
        id: true,
        bio: true,
        availability: true,
        expertiseTagIds: true,
        user: { select: { fullName: true } },
      },
    });
  }

  async createMatch(dto: CreateMentorMatchDto) {
    const match = await this.prisma.mentorMatch.upsert({
      where: { mentorId_innovationId: { mentorId: dto.mentorId, innovationId: dto.innovationId } },
      update: {},
      create: dto,
      include: { mentor: { include: { user: { select: { id: true } } } } },
    });

    await this.notifications.send({
      userId: match.mentor.user.id,
      templateCode: 'MENTOR_MATCHED',
      channel: 'EMAIL' as any,
      payload: { innovationId: dto.innovationId },
    });

    return match;
  }

  myMatches(mentorUserId: string) {
    return this.prisma.mentorMatch.findMany({
      where: { mentor: { userId: mentorUserId } },
      include: { innovation: { select: { id: true, slug: true, titleEn: true, innovationCode: true } } },
    });
  }

  async proposeSession(dto: ProposeSessionDto) {
    const session = await this.prisma.mentorSession.create({
      data: {
        mentorId: dto.mentorId,
        innovatorUserId: dto.innovatorUserId,
        innovationId: dto.innovationId,
        scheduledAt: new Date(dto.scheduledAt),
        mode: dto.mode ?? 'ONLINE',
      },
    });

    await this.notifications.send({
      userId: dto.innovatorUserId,
      templateCode: 'MENTOR_SESSION_PROPOSED',
      channel: 'EMAIL' as any,
      payload: { scheduledAt: dto.scheduledAt },
    });

    return session;
  }

  async updateSessionStatus(id: string, dto: UpdateSessionStatusDto) {
    return this.prisma.mentorSession.update({ where: { id }, data: { status: dto.status } });
  }

  async submitFeedback(sessionId: string, dto: SubmitMentorFeedbackDto) {
    const session = await this.prisma.mentorSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.mentorFeedback.upsert({
      where: { sessionId },
      update: { feedback: dto.feedback, rating: dto.rating },
      create: { sessionId, feedback: dto.feedback, rating: dto.rating },
    });
  }

  mySessions(mentorUserId: string) {
    return this.prisma.mentorSession.findMany({
      where: { mentor: { userId: mentorUserId } },
      include: { feedback: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async logActivity(mentorUserId: string, dto: LogMentorActivityDto) {
    const mentor = await this.prisma.mentor.findUniqueOrThrow({ where: { userId: mentorUserId } });
    return this.prisma.mentorActivityLog.create({
      data: { mentorId: mentor.id, hours: dto.hours, description: dto.description },
    });
  }

  async myActivityLogs(mentorUserId: string) {
    const mentor = await this.prisma.mentor.findUnique({ where: { userId: mentorUserId } });
    if (!mentor) return [];
    return this.prisma.mentorActivityLog.findMany({
      where: { mentorId: mentor.id },
      orderBy: { loggedAt: 'desc' },
    });
  }
}
