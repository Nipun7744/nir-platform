import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PipelineService } from './pipeline.service';
import { AddPipelineNoteDto, UpdatePipelineStageDto } from './dto/pipeline.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('pipeline')
@UseGuards(RolesGuard)
@Roles(Role.INNOVATION_MANAGER, Role.PLATFORM_ADMIN, Role.INSTITUTIONAL_COORDINATOR)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('board')
  board() {
    return this.pipelineService.board();
  }

  @Post('notes')
  addNote(@Body() dto: AddPipelineNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pipelineService.addNote(dto, user.id);
  }

  @Get('notes/by-innovation/:innovationId')
  notes(@Param('innovationId') innovationId: string) {
    return this.pipelineService.notesForInnovation(innovationId);
  }

  @Patch('innovations/:innovationId/stage')
  updateStage(
    @Param('innovationId') innovationId: string,
    @Body() dto: UpdatePipelineStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pipelineService.updateStage(innovationId, dto, user.id);
  }
}
