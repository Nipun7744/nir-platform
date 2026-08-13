import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { AddPipelineNoteDto, UpdatePipelineStageDto } from './dto/pipeline.dto';

/** Component 7 — Innovation Management: internal cross-functional lifecycle tracking. */
@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async addNote(dto: AddPipelineNoteDto, authorId: string) {
    const note = await this.prisma.pipelineNote.create({
      data: { innovationId: dto.innovationId, authorId, note: dto.note, attachmentUrl: dto.attachmentUrl },
    });
    await this.auditLog.record({
      actorId: authorId,
      action: 'PIPELINE_NOTE_ADDED',
      entityType: 'Innovation',
      entityId: dto.innovationId,
    });
    return note;
  }

  notesForInnovation(innovationId: string) {
    return this.prisma.pipelineNote.findMany({
      where: { innovationId },
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStage(innovationId: string, dto: UpdatePipelineStageDto, actorId: string) {
    const updated = await this.prisma.innovation.update({
      where: { id: innovationId },
      data: { pipelineStage: dto.pipelineStage },
    });
    await this.auditLog.record({
      actorId,
      action: 'PIPELINE_STAGE_UPDATED',
      entityType: 'Innovation',
      entityId: innovationId,
      metadata: { pipelineStage: dto.pipelineStage },
    });
    return updated;
  }

  board() {
    return this.prisma.innovation.findMany({
      where: { reviewStatus: { in: ['SELECTED', 'PUBLISHED'] } },
      select: {
        id: true,
        slug: true,
        titleEn: true,
        innovationCode: true,
        pipelineStage: true,
        category: { select: { nameEn: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
