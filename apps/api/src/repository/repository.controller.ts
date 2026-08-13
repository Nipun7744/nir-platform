import { Controller, Get, Param, Query } from '@nestjs/common';
import { RepositoryService } from './repository.service';
import { SearchInnovationsDto } from './dto/search-innovations.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('repository')
@Public()
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Get('search')
  search(@Query() dto: SearchInnovationsDto) {
    return this.repositoryService.search(dto);
  }

  @Get('featured')
  featured(@Query('limit') limit?: string) {
    return this.repositoryService.featured(limit ? Number(limit) : undefined);
  }

  @Get('related/:innovationId')
  related(@Param('innovationId') innovationId: string, @Query('limit') limit?: string) {
    return this.repositoryService.related(innovationId, limit ? Number(limit) : undefined);
  }
}
