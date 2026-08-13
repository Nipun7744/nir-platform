import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MinistriesService } from './ministries.service';
import { RegisterFocalPointDto, CreateCycleDto, CreateSubmissionDto } from './dto/ministries.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('ministries')
@UseGuards(RolesGuard)
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Post('focal-points/register')
  registerFocalPoint(@Body() dto: RegisterFocalPointDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ministriesService.registerFocalPoint(user.id, dto);
  }

  @Post('cycles')
  @Roles(Role.PLATFORM_ADMIN)
  createCycle(@Body() dto: CreateCycleDto) {
    return this.ministriesService.createCycle(dto);
  }

  @Get('cycles')
  cycles() {
    return this.ministriesService.cycles();
  }

  @Get('cycles/current')
  currentCycle() {
    return this.ministriesService.currentCycle();
  }

  @Post('submissions')
  @Roles(Role.MINISTRY_FOCAL_POINT)
  createSubmission(@Body() dto: CreateSubmissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ministriesService.createSubmission(user.id, dto);
  }

  @Get('submissions/mine')
  @Roles(Role.MINISTRY_FOCAL_POINT)
  mySubmissions(@CurrentUser() user: AuthenticatedUser) {
    return this.ministriesService.mySubmissions(user.id);
  }

  @Patch('submissions/:id/submit')
  @Roles(Role.MINISTRY_FOCAL_POINT)
  submitForValidation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ministriesService.submitForValidation(id, user.id);
  }

  @Patch('submissions/:id/validate')
  @Roles(Role.PLATFORM_ADMIN, Role.POLICY_OBSERVER)
  validate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ministriesService.validate(id, user.id);
  }

  @Get(':ministryId/report/:cycleId')
  @Roles(Role.MINISTRY_FOCAL_POINT, Role.PLATFORM_ADMIN, Role.POLICY_OBSERVER)
  report(@Param('ministryId') ministryId: string, @Param('cycleId') cycleId: string) {
    return this.ministriesService.annualReport(ministryId, cycleId);
  }

  @Post(':ministryId/report/:cycleId/generate')
  @Roles(Role.PLATFORM_ADMIN)
  generateReport(@Param('ministryId') ministryId: string, @Param('cycleId') cycleId: string) {
    return this.ministriesService.generateAnnualReport(ministryId, cycleId);
  }
}
