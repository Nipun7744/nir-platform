import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FundingService } from './funding.service';
import {
  RegisterInvestorDto,
  CreateEoiDto,
  UpdateEoiStatusDto,
  CreateFundingAgreementDto,
  CreateFundDisbursementDto,
  CreateReferralDto,
} from './dto/funding.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller()
@UseGuards(RolesGuard)
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Post('investors/register')
  registerInvestor(@Body() dto: RegisterInvestorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.registerInvestor(user.id, dto);
  }

  @Public()
  @Get('investors')
  directory(@Query('categoryId') categoryId?: string) {
    return this.fundingService.findDirectory(categoryId);
  }

  @Post('investors/referrals')
  @Roles(Role.EXPERT_EVALUATOR)
  createReferral(@Body() dto: CreateReferralDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.createReferral(user.id, dto);
  }

  @Get('investors/referrals/mine')
  @Roles(Role.INVESTOR)
  myReferrals(@CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.myReferrals(user.id);
  }

  @Post('eoi')
  @Roles(Role.INVESTOR)
  createEoi(@Body() dto: CreateEoiDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.createEoi(user.id, dto);
  }

  @Get('eoi/mine')
  @Roles(Role.INVESTOR)
  myEois(@CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.myEois(user.id);
  }

  @Get('eoi/by-innovation/:innovationId')
  @Roles(Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN, Role.INNOVATION_MANAGER)
  eoisForInnovation(@Param('innovationId') innovationId: string) {
    return this.fundingService.eoisForInnovation(innovationId);
  }

  @Patch('eoi/:id/status')
  @Roles(Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN)
  updateEoiStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEoiStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fundingService.updateEoiStatus(id, dto, user.id);
  }

  @Post('funding-agreements')
  @Roles(Role.INSTITUTIONAL_COORDINATOR, Role.PLATFORM_ADMIN, Role.INNOVATION_MANAGER)
  createAgreement(@Body() dto: CreateFundingAgreementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.createAgreement(dto, user.id);
  }

  @Post('fund-disbursements')
  @Roles(Role.INNOVATION_MANAGER, Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  createDisbursement(@Body() dto: CreateFundDisbursementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.createDisbursement(dto, user.id);
  }

  @Get('fund-disbursements/by-innovation/:innovationId')
  @Roles(Role.INNOVATION_MANAGER, Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN, Role.INSTITUTIONAL_COORDINATOR)
  disbursementsForInnovation(@Param('innovationId') innovationId: string) {
    return this.fundingService.disbursementsForInnovation(innovationId);
  }
}
