import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannel, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class UpsertNotificationTemplateDto {
  @IsString() code!: string;
  @IsEnum(NotificationChannel) channel!: NotificationChannel;
  @IsOptional() @IsString() subjectEn?: string;
  @IsOptional() @IsString() subjectBn?: string;
  @IsString() bodyEn!: string;
  @IsOptional() @IsString() bodyBn?: string;
}

@Controller('notification-templates')
@UseGuards(RolesGuard)
@Roles(Role.PLATFORM_ADMIN)
export class NotificationTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.notificationTemplate.findMany({ orderBy: { code: 'asc' } });
  }

  @Post()
  create(@Body() dto: UpsertNotificationTemplateDto) {
    return this.prisma.notificationTemplate.upsert({
      where: { code: dto.code },
      update: dto,
      create: dto,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertNotificationTemplateDto>) {
    return this.prisma.notificationTemplate.update({ where: { id }, data: dto });
  }
}
