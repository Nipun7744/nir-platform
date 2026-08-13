import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('media')
@UseGuards(RolesGuard)
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin-only browse of the shared media library (SRS FR-C4.M2.07). */
  @Get()
  @Roles(Role.PLATFORM_ADMIN)
  list() {
    return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Any authenticated user may register metadata for a file they uploaded via /uploads. */
  @Post()
  register(
    @Body() body: { url: string; mimeType: string; sizeBytes: number; altTextEn?: string; altTextBn?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prisma.mediaAsset.create({ data: { ...body, uploadedById: user.id } });
  }
}
