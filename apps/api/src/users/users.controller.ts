import { Body, ConflictException, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { UpdateRolesDto } from './dto/update-roles.dto';
import { UpdateEvaluatorProfileDto } from './dto/update-evaluator-profile.dto';
import { UpdatePreliminaryReviewerProfileDto } from './dto/update-preliminary-reviewer-profile.dto';
import { UpdateAuthenticityReviewerProfileDto } from './dto/update-authenticity-reviewer-profile.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditLogService } from '../common/services/audit-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findProfileById(user.id);
  }

  @Patch('me')
  async updateMe(@Body() dto: UpdateMyProfileDto, @CurrentUser() user: AuthenticatedUser) {
    const isEvaluator = user.roles?.includes(Role.EXPERT_EVALUATOR);
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
          ...(dto.designation !== undefined ? { designation: dto.designation || null } : {}),
          ...(dto.institution !== undefined ? { institution: dto.institution || null } : {}),
          ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl || null } : {}),
          // Category self-management is a evaluator-only privilege; silently ignore for other roles
          // rather than erroring, since the field has no effect for them anyway.
          ...(dto.categoryIds !== undefined && isEvaluator ? { evaluatorCategoryIds: dto.categoryIds } : {}),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('That phone number is already in use by another account');
      }
      throw err;
    }
    return this.usersService.findProfileById(user.id);
  }

  @Get(':id/submitter-profile')
  @Roles(Role.PRELIMINARY_REVIEWER, Role.AUTHENTICITY_REVIEWER, Role.EXPERT_EVALUATOR, Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  submitterProfile(@Param('id') id: string) {
    return this.usersService.findSubmitterProfile(id);
  }

  @Get('evaluators')
  @Roles(Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN)
  evaluators(@Query('categoryId') categoryId?: string) {
    return this.prisma.user.findMany({
      where: {
        roles: { has: Role.EXPERT_EVALUATOR },
        isActive: true,
        ...(categoryId ? { evaluatorCategoryIds: { has: categoryId } } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        designation: true,
        institution: true,
        avatarUrl: true,
        evaluatorCategoryIds: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  @Get()
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
    @Query('status') status?: 'pending' | 'active' | 'rejected',
  ) {
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = {
      ...(status === 'pending' ? { isActive: false, rejectedAt: null } : {}),
      ...(status === 'active' ? { isActive: true } : {}),
      ...(status === 'rejected' ? { rejectedAt: { not: null } } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { fullName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          roles: true,
          isActive: true,
          rejectedAt: true,
          createdAt: true,
          lastLoginAt: true,
          designation: true,
          institution: true,
          avatarUrl: true,
          evaluatorCategoryIds: true,
          preliminaryReviewerCategoryIds: true,
          authenticityReviewerCategoryIds: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: Number(page), pageSize: take };
  }

  @Patch(':id/roles')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  async updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { roles: dto.roles },
      select: { id: true, email: true, roles: true },
    });
    await this.auditLog.record({
      actorId: actor.id,
      action: 'USER_ROLES_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: { roles: dto.roles },
    });
    return updated;
  }

  @Patch(':id/status')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const updated = await this.prisma.user.update({
      where: { id },
      // Approving (isActive: true) also clears a prior rejection, so re-approving
      // a previously rejected account is possible from the same toggle.
      data: { isActive, ...(isActive ? { rejectedAt: null } : {}) },
      select: { id: true, email: true, isActive: true, rejectedAt: true },
    });
    await this.auditLog.record({
      actorId: actor.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: id,
    });
    return updated;
  }

  @Patch(':id/evaluator-profile')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  async updateEvaluatorProfile(
    @Param('id') id: string,
    @Body() dto: UpdateEvaluatorProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.designation !== undefined ? { designation: dto.designation || null } : {}),
        ...(dto.institution !== undefined ? { institution: dto.institution || null } : {}),
        ...(dto.categoryIds !== undefined ? { evaluatorCategoryIds: dto.categoryIds } : {}),
      },
      select: {
        id: true,
        email: true,
        designation: true,
        institution: true,
        evaluatorCategoryIds: true,
      },
    });
    await this.auditLog.record({
      actorId: actor.id,
      action: 'EVALUATOR_PROFILE_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: { designation: dto.designation, institution: dto.institution, categoryIds: dto.categoryIds },
    });
    return updated;
  }

  @Patch(':id/preliminary-reviewer-profile')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  async updatePreliminaryReviewerProfile(
    @Param('id') id: string,
    @Body() dto: UpdatePreliminaryReviewerProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.categoryIds !== undefined ? { preliminaryReviewerCategoryIds: dto.categoryIds } : {}),
      },
      select: {
        id: true,
        email: true,
        preliminaryReviewerCategoryIds: true,
      },
    });
    await this.auditLog.record({
      actorId: actor.id,
      action: 'PRELIMINARY_REVIEWER_PROFILE_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: { categoryIds: dto.categoryIds },
    });
    return updated;
  }

  @Patch(':id/authenticity-reviewer-profile')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  async updateAuthenticityReviewerProfile(
    @Param('id') id: string,
    @Body() dto: UpdateAuthenticityReviewerProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.categoryIds !== undefined ? { authenticityReviewerCategoryIds: dto.categoryIds } : {}),
      },
      select: {
        id: true,
        email: true,
        authenticityReviewerCategoryIds: true,
      },
    });
    await this.auditLog.record({
      actorId: actor.id,
      action: 'AUTHENTICITY_REVIEWER_PROFILE_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: { categoryIds: dto.categoryIds },
    });
    return updated;
  }

  @Patch(':id/reject')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  async reject(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, rejectedAt: new Date() },
      select: { id: true, email: true, isActive: true, rejectedAt: true },
    });
    await this.auditLog.record({
      actorId: actor.id,
      action: 'USER_REJECTED',
      entityType: 'User',
      entityId: id,
    });
    return updated;
  }
}
