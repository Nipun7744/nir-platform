import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ChallengesService } from './challenges.service';
import {
  CreateChallengeDto,
  SaveFormDto,
  SubmissionFilterDto,
  SubmitChallengeDto,
  UpdateChallengeDto,
} from './dto/challenge.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Innovation Challenges / Calls — moved out of cms/public-content.controller.ts (2026-11-10) when
 * challenges gained per-challenge submission forms. Literal `admin` routes are declared before
 * `:slug` so they aren't swallowed by it.
 */
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly service: ChallengesService) {}

  // ---- admin (PLATFORM_ADMIN — unchanged from the previous CMS challenge CRUD guard)

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  listAdmin() {
    return this.service.listAdmin();
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  getAdmin(@Param('id') id: string) {
    return this.service.getAdmin(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  create(@Body() dto: CreateChallengeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateChallengeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }

  /** Form builder save — replaces the challenge's whole submission form. */
  @Put(':id/form')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  saveForm(@Param('id') id: string, @Body() dto: SaveFormDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.saveForm(id, dto, user.id);
  }

  // ---- public (admins may also preview unpublished challenges)

  @Public()
  @Get()
  listPublic() {
    return this.service.listPublic();
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @CurrentUser() viewer?: AuthenticatedUser) {
    return this.service.findBySlug(slug, viewer);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug/form')
  getForm(@Param('slug') slug: string, @CurrentUser() viewer?: AuthenticatedUser) {
    return this.service.getForm(slug, viewer);
  }

  /** Challenge submission — authenticated only (no @Public), so anonymous calls get 401. */
  @Post(':slug/submissions')
  submit(@Param('slug') slug: string, @Body() dto: SubmitChallengeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submit(slug, dto, user);
  }
}

/** Admin submission monitoring across both channels (general + challenge). */
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly service: ChallengesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  list(@Query() filters: SubmissionFilterDto) {
    return this.service.listSubmissions(filters);
  }
}
