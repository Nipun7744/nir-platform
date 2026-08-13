import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LookupsService } from './lookups.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTagDto, CreateSdgTagDto, CreateRegionDto, CreateMinistryDto } from './dto/reference-data.dto';

@Controller()
@UseGuards(RolesGuard)
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Public()
  @Get('tags')
  findTags(@Query('type') type?: 'THEMATIC' | 'TECHNOLOGY') {
    return this.lookups.findTags(type);
  }

  @Post('tags')
  @Roles(Role.PLATFORM_ADMIN)
  createTag(@Body() dto: CreateTagDto) {
    return this.lookups.createTag(dto);
  }

  @Public()
  @Get('sdg-tags')
  findSdgTags() {
    return this.lookups.findSdgTags();
  }

  @Post('sdg-tags')
  @Roles(Role.PLATFORM_ADMIN)
  createSdgTag(@Body() dto: CreateSdgTagDto) {
    return this.lookups.createSdgTag(dto);
  }

  @Public()
  @Get('regions')
  findRegions() {
    return this.lookups.findRegions();
  }

  @Post('regions')
  @Roles(Role.PLATFORM_ADMIN)
  createRegion(@Body() dto: CreateRegionDto) {
    return this.lookups.createRegion(dto);
  }

  @Public()
  @Get('ministries')
  findMinistries() {
    return this.lookups.findMinistries();
  }

  @Post('ministries')
  @Roles(Role.PLATFORM_ADMIN)
  createMinistry(@Body() dto: CreateMinistryDto) {
    return this.lookups.createMinistry(dto);
  }
}
