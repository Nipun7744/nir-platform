import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, ContentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentItemDto, UpdateContentItemDto, UpdateContentStatusDto } from './dto/content-item.dto';

const WORKFLOW: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: [ContentStatus.IN_REVIEW],
  IN_REVIEW: [ContentStatus.APPROVED, ContentStatus.DRAFT],
  APPROVED: [ContentStatus.PUBLISHED, ContentStatus.DRAFT],
  PUBLISHED: [ContentStatus.DRAFT],
};

@Injectable()
export class ContentItemsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateContentItemDto, authorId: string) {
    return this.prisma.contentItem.create({ data: { ...dto, authorId } });
  }

  findPublished(type?: ContentType) {
    return this.prisma.contentItem.findMany({
      where: { status: 'PUBLISHED', ...(type ? { type } : {}) },
      orderBy: { publishedAt: 'desc' },
    });
  }

  findAllForAdmin(type?: ContentType) {
    return this.prisma.contentItem.findMany({
      where: type ? { type } : {},
      orderBy: { updatedAt: 'desc' },
      include: { author: { select: { fullName: true } } },
    });
  }

  async findBySlugPublished(slug: string) {
    const item = await this.prisma.contentItem.findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (!item) throw new NotFoundException('Content not found');
    return item;
  }

  async update(id: string, dto: UpdateContentItemDto, editedById: string) {
    const existing = await this.prisma.contentItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Content item not found');

    await this.prisma.contentRevision.create({
      data: { contentItemId: id, editedById, snapshot: existing as any },
    });

    return this.prisma.contentItem.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, dto: UpdateContentStatusDto) {
    const existing = await this.prisma.contentItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Content item not found');

    const allowed = WORKFLOW[existing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot move content from ${existing.status} to ${dto.status}`);
    }

    return this.prisma.contentItem.update({
      where: { id },
      data: {
        status: dto.status,
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : existing.publishedAt,
      },
    });
  }

  revisions(id: string) {
    return this.prisma.contentRevision.findMany({
      where: { contentItemId: id },
      include: { editedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
