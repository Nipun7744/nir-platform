import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

export class UpdateSubmissionSettingsDto {
  @IsOptional() @IsBoolean() generalSubmissionEnabled?: boolean;
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Public — the portal reads this to show or hide the general "Submit an Innovation" entry points. */
  @Public()
  @Get('submission')
  getSubmissionSettings() {
    return this.settings.getSubmissionSettings();
  }

  @Patch('submission')
  @UseGuards(RolesGuard)
  @Roles(Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN)
  updateSubmissionSettings(@Body() dto: UpdateSubmissionSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateSubmissionSettings(dto, user.id);
  }
}
