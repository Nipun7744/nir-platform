import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  create(
    @Body() body: { label: string; queryJson: Record<string, unknown> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prisma.savedSearch.create({
      data: { userId: user.id, label: body.label, queryJson: body.queryJson as any },
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.savedSearch.delete({ where: { id } });
  }
}
