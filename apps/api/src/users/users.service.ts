import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findProfileById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        designation: true,
        institution: true,
        avatarUrl: true,
        evaluatorCategoryIds: true,
        preliminaryReviewerCategoryIds: true,
        authenticityReviewerCategoryIds: true,
        roles: true,
        locale: true,
        isActive: true,
        mfaEnabled: true,
        createdAt: true,
        innovatorProfile: {
          select: {
            irn: true,
            nidVerified: true,
            bio: true,
            organization: { select: { name: true } },
          },
        },
        investorProfile: { select: { id: true, organizationName: true, binVerified: true } },
        mentorProfile: { select: { id: true, bio: true } },
        ministryProfile: { select: { id: true, ministryId: true, title: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Restricted to Preliminary Reviewers / Expert Evaluators / admins — see users.controller.ts guard. */
  async findSubmitterProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        designation: true,
        institution: true,
        innovatorProfile: {
          select: {
            irn: true,
            nidVerified: true,
            bio: true,
            organization: { select: { name: true, type: true, websiteUrl: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Submitter not found');
    return user;
  }
}
