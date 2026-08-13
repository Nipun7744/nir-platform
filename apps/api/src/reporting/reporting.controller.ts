import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { ReportingService } from './reporting.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('reporting')
@UseGuards(RolesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Public()
  @Get('public-stats')
  publicStats() {
    return this.reportingService.publicStats();
  }

  @Public()
  @Get('public-breakdown')
  publicBreakdown() {
    return this.reportingService.publicBreakdown();
  }

  @Get('kpis')
  @Roles(Role.PLATFORM_ADMIN, Role.POLICY_OBSERVER, Role.SYSTEM_ADMIN)
  kpis() {
    return this.reportingService.kpis();
  }

  @Get('fund-utilization')
  @Roles(Role.PLATFORM_ADMIN, Role.POLICY_OBSERVER, Role.INNOVATION_MANAGER)
  fundUtilization() {
    return this.reportingService.fundUtilization();
  }

  @Get('service-analytics')
  @Roles(Role.PLATFORM_ADMIN, Role.POLICY_OBSERVER)
  serviceAnalytics() {
    return this.reportingService.serviceAnalytics();
  }

  @Get('export/innovations.csv')
  @Roles(Role.PLATFORM_ADMIN, Role.POLICY_OBSERVER, Role.INNOVATION_MANAGER)
  async exportCsv(
    @Res() res: Response,
    @Query('ministryId') ministryId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const csv = await this.reportingService.exportInnovationsCsv({ ministryId, categoryId });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nir-innovations-report.csv"');
    res.send(csv);
  }
}
