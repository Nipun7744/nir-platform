import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PublicContentService } from './public-content.service';
import {
  CreateFaqDto,
  CreateNewsDto,
  CreateChallengeDto,
  CreateResourceDto,
  CreatePartnerDto,
  CreateFeedbackDto,
} from './dto/public-content.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@Controller()
export class PublicContentController {
  constructor(private readonly service: PublicContentService) {}

  // FAQ
  @Public() @Get('faqs') faqs() {
    return this.service.faqs();
  }
  @Get('faqs/admin') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) faqsForAdmin() {
    return this.service.faqsForAdmin();
  }
  @Post('faqs') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) createFaq(@Body() dto: CreateFaqDto) {
    return this.service.createFaq(dto);
  }
  @Patch('faqs/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) updateFaq(@Param('id') id: string, @Body() dto: Partial<CreateFaqDto> & { isActive?: boolean }) {
    return this.service.updateFaq(id, dto);
  }
  @Delete('faqs/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) deleteFaq(@Param('id') id: string) {
    return this.service.deleteFaq(id);
  }

  // News & Events
  @Public() @Get('news') news(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.news(page ? Number(page) : undefined, pageSize ? Number(pageSize) : undefined);
  }
  @Get('news/admin') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) newsForAdmin() {
    return this.service.newsForAdmin();
  }
  @Public() @Get('news/:slug') newsBySlug(@Param('slug') slug: string) {
    return this.service.newsBySlug(slug);
  }
  @Post('news') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) createNews(@Body() dto: CreateNewsDto) {
    return this.service.createNews(dto);
  }
  @Patch('news/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) updateNews(@Param('id') id: string, @Body() dto: Partial<CreateNewsDto> & { unpublish?: boolean }) {
    return this.service.updateNews(id, dto);
  }
  @Delete('news/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) deleteNews(@Param('id') id: string) {
    return this.service.deleteNews(id);
  }

  // Innovation Challenges / Calls
  @Public() @Get('challenges') challenges() {
    return this.service.challenges();
  }
  @Public() @Get('challenges/:slug') challengeBySlug(@Param('slug') slug: string) {
    return this.service.challengeBySlug(slug);
  }
  @Post('challenges') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) createChallenge(@Body() dto: CreateChallengeDto) {
    return this.service.createChallenge(dto);
  }
  @Patch('challenges/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) updateChallenge(@Param('id') id: string, @Body() dto: Partial<CreateChallengeDto>) {
    return this.service.updateChallenge(id, dto);
  }
  @Delete('challenges/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) deleteChallenge(@Param('id') id: string) {
    return this.service.deleteChallenge(id);
  }

  // Resources
  @Public() @Get('resources') resources(@Query('type') type?: string) {
    return this.service.resources(type);
  }
  @Post('resources') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) createResource(@Body() dto: CreateResourceDto) {
    return this.service.createResource(dto);
  }
  @Patch('resources/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) updateResource(@Param('id') id: string, @Body() dto: Partial<CreateResourceDto>) {
    return this.service.updateResource(id, dto);
  }
  @Delete('resources/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) deleteResource(@Param('id') id: string) {
    return this.service.deleteResource(id);
  }

  // Partners
  @Public() @Get('partners') partners() {
    return this.service.partners();
  }
  @Get('partners/admin') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) partnersForAdmin() {
    return this.service.partnersForAdmin();
  }
  @Post('partners') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) createPartner(@Body() dto: CreatePartnerDto) {
    return this.service.createPartner(dto);
  }
  @Patch('partners/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) updatePartner(@Param('id') id: string, @Body() dto: Partial<CreatePartnerDto> & { isActive?: boolean }) {
    return this.service.updatePartner(id, dto);
  }
  @Delete('partners/:id') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) deletePartner(@Param('id') id: string) {
    return this.service.deletePartner(id);
  }

  // Feedback & Grievance
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('feedback')
  createFeedback(@Body() dto: CreateFeedbackDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.createFeedback(dto, user?.id);
  }
  @Get('feedback') @UseGuards(RolesGuard) @Roles(Role.PLATFORM_ADMIN) feedbackList() {
    return this.service.feedbackList();
  }
  @Patch('feedback/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  updateFeedbackStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateFeedbackStatus(id, status);
  }
}
