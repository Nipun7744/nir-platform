import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EvaluationsService } from './evaluations.service';
import { AssignPanelDto } from './dto/assign-panel.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { IpFlagDto } from './dto/ip-flag.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('evaluations')
@UseGuards(RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post('panel-assignments')
  @Roles(Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN)
  assignPanel(@Body() dto: AssignPanelDto, @CurrentUser() user: AuthenticatedUser) {
    return this.evaluationsService.assignPanel(dto, user.id);
  }

  @Get('assigned-to-me')
  @Roles(Role.EXPERT_EVALUATOR)
  assignedToMe(@CurrentUser() user: AuthenticatedUser) {
    return this.evaluationsService.listAssignedToMe(user.id);
  }

  @Post()
  @Roles(Role.EXPERT_EVALUATOR)
  submit(@Body() dto: SubmitEvaluationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.evaluationsService.submitEvaluation(dto, user.id);
  }

  @Post('ip-flags')
  @Roles(Role.EXPERT_EVALUATOR, Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN)
  flagIp(@Body() dto: IpFlagDto, @CurrentUser() user: AuthenticatedUser) {
    return this.evaluationsService.flagIp(dto, user.id);
  }

  @Get('ip-flags')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  listIpFlags() {
    return this.evaluationsService.listIpFlags();
  }

  @Get('shortlisted')
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  listShortlisted() {
    return this.evaluationsService.listShortlisted();
  }

  @Get('by-innovation/:innovationId')
  @Roles(Role.EXPERT_EVALUATOR, Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN, Role.INNOVATION_MANAGER)
  listForInnovation(@Param('innovationId') innovationId: string) {
    return this.evaluationsService.listForInnovation(innovationId);
  }
}
