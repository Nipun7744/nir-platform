import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { InnovationsService } from './innovations.service';
import { CreateInnovationDto } from './dto/create-innovation.dto';
import { UpdateInnovationDto } from './dto/update-innovation.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { ReplaceAttachmentDto } from './dto/replace-attachment.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateApprovalDto } from './dto/update-approval.dto';
import { RepositoryFilterDto } from './dto/repository-filter.dto';
import { ActivityLogFilterDto } from './dto/activity-log-filter.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('innovations')
export class InnovationsController {
  constructor(private readonly innovationsService: InnovationsService) {}

  @Post()
  create(@Body() dto: CreateInnovationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.innovationsService.create(dto, user.id);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.innovationsService.findMine(user.id);
  }

  @Get('moderation-queue')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN)
  findAllForModeration(@Query('reviewStatus') reviewStatus?: any) {
    return this.innovationsService.findAllForModeration(reviewStatus);
  }

  @Get('preliminary-review-queue')
  @UseGuards(RolesGuard)
  @Roles(Role.PRELIMINARY_REVIEWER, Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  findPreliminaryReviewQueue(
    @Query('reviewStatus') reviewStatus: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.findPreliminaryReviewQueue(user, reviewStatus);
  }

  @Get('authenticity-review-queue')
  @UseGuards(RolesGuard)
  @Roles(Role.AUTHENTICITY_REVIEWER, Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  findAuthenticityReviewQueue(
    @Query('reviewStatus') reviewStatus: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.findAuthenticityReviewQueue(user, reviewStatus);
  }

  /** Admin Repository Management listing — Platform/System Admin only, see PROJECT_CONTEXT.md. */
  @Get('admin/repository')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  findForRepositoryManagement(@Query() filters: RepositoryFilterDto) {
    return this.innovationsService.findForRepositoryManagement(filters);
  }

  /** Repository-wide admin activity feed (all innovations) — Platform/System Admin only. */
  @Get('admin/activity-log')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  listActivityLogAll(@Query() filters: ActivityLogFilterDto) {
    return this.innovationsService.listActivityLog(filters);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string, @CurrentUser() viewer?: AuthenticatedUser) {
    return this.innovationsService.findOneForViewer(idOrSlug, viewer);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInnovationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.update(id, dto, user.id, user.roles);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.innovationsService.submit(id, user.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTITUTIONAL_COORDINATOR, Role.INNOVATION_MANAGER, Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN, Role.PRELIMINARY_REVIEWER, Role.AUTHENTICITY_REVIEWER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.updateStatus(id, dto, user.id, user.roles);
  }

  @Patch(':id/approval')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  updateApproval(
    @Param('id') id: string,
    @Body() dto: UpdateApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.updateApproval(id, dto, user.id);
  }

  /** Per-innovation admin activity history — Platform/System Admin only. */
  @Get(':id/activity-log')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  listActivityLog(@Param('id') id: string, @Query() filters: ActivityLogFilterDto) {
    return this.innovationsService.listActivityLog({ ...filters, entityId: id });
  }

  @Get(':id/review-comments')
  @UseGuards(RolesGuard)
  @Roles(
    Role.PRELIMINARY_REVIEWER,
    Role.AUTHENTICITY_REVIEWER,
    Role.EXPERT_EVALUATOR,
    Role.INSTITUTIONAL_COORDINATOR,
    Role.INNOVATION_MANAGER,
    Role.PLATFORM_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  listReviewComments(@Param('id') id: string) {
    return this.innovationsService.listReviewComments(id);
  }

  @Post(':id/team')
  addTeamMember(
    @Param('id') id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.addTeamMember(id, dto, user.id, user.roles);
  }

  @Delete(':id/team/:memberId')
  removeTeamMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.removeTeamMember(id, memberId, user.id, user.roles);
  }

  @Post(':id/attachments')
  addAttachment(
    @Param('id') id: string,
    @Body() dto: AddAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.addAttachment(id, dto, user.id, user.roles);
  }

  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.removeAttachment(id, attachmentId, user.id, user.roles);
  }

  @Patch(':id/attachments/:attachmentId')
  replaceAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Body() dto: ReplaceAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.innovationsService.replaceAttachment(id, attachmentId, dto, user.id, user.roles);
  }
}
