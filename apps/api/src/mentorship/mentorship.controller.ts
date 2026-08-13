import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MentorshipService } from './mentorship.service';
import {
  RegisterMentorDto,
  CreateMentorMatchDto,
  ProposeSessionDto,
  UpdateSessionStatusDto,
  SubmitMentorFeedbackDto,
  LogMentorActivityDto,
} from './dto/mentorship.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('mentors')
@UseGuards(RolesGuard)
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  @Post('register')
  register(@Body() dto: RegisterMentorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorshipService.registerMentor(user.id, dto);
  }

  @Public()
  @Get()
  directory(@Query('tagIds') tagIds?: string) {
    return this.mentorshipService.findDirectory(tagIds ? tagIds.split(',') : undefined);
  }

  @Post('matches')
  @Roles(Role.MENTOR, Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN, Role.EXPERT_EVALUATOR)
  createMatch(@Body() dto: CreateMentorMatchDto) {
    return this.mentorshipService.createMatch(dto);
  }

  @Get('matches/mine')
  @Roles(Role.MENTOR)
  myMatches(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorshipService.myMatches(user.id);
  }

  @Post('sessions')
  @Roles(Role.MENTOR)
  proposeSession(@Body() dto: ProposeSessionDto) {
    return this.mentorshipService.proposeSession(dto);
  }

  @Get('sessions/mine')
  @Roles(Role.MENTOR)
  mySessions(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorshipService.mySessions(user.id);
  }

  @Patch('sessions/:id/status')
  updateSessionStatus(@Param('id') id: string, @Body() dto: UpdateSessionStatusDto) {
    return this.mentorshipService.updateSessionStatus(id, dto);
  }

  @Post('sessions/:id/feedback')
  submitFeedback(@Param('id') id: string, @Body() dto: SubmitMentorFeedbackDto) {
    return this.mentorshipService.submitFeedback(id, dto);
  }

  @Post('activity-logs')
  @Roles(Role.MENTOR)
  logActivity(@Body() dto: LogMentorActivityDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mentorshipService.logActivity(user.id, dto);
  }

  @Get('activity-logs/mine')
  @Roles(Role.MENTOR)
  myActivityLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorshipService.myActivityLogs(user.id);
  }
}
