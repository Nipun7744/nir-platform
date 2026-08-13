import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ContentType, Role } from '@prisma/client';
import { ContentItemsService } from './content-items.service';
import { CreateContentItemDto, UpdateContentItemDto, UpdateContentStatusDto } from './dto/content-item.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('content')
@UseGuards(RolesGuard)
@Roles(Role.PLATFORM_ADMIN)
export class ContentItemsController {
  constructor(private readonly contentItemsService: ContentItemsService) {}

  @Public()
  @Get('published')
  findPublished(@Query('type') type?: ContentType) {
    return this.contentItemsService.findPublished(type);
  }

  @Public()
  @Get('published/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.contentItemsService.findBySlugPublished(slug);
  }

  @Get()
  findAllForAdmin(@Query('type') type?: ContentType) {
    return this.contentItemsService.findAllForAdmin(type);
  }

  @Post()
  create(@Body() dto: CreateContentItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contentItemsService.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContentItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contentItemsService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContentStatusDto) {
    return this.contentItemsService.updateStatus(id, dto);
  }

  @Get(':id/revisions')
  revisions(@Param('id') id: string) {
    return this.contentItemsService.revisions(id);
  }
}
