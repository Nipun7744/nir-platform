import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchInnovationsDto, SortOption } from './dto/search-innovations.dto';

const CARD_SELECT = {
  id: true,
  innovationCode: true,
  slug: true,
  titleEn: true,
  titleBn: true,
  summaryEn: true,
  summaryBn: true,
  developmentStage: true,
  innovationType: true,
  isFeatured: true,
  viewCount: true,
  publishedAt: true,
  category: { select: { id: true, slug: true, nameEn: true, nameBn: true, icon: true } },
  region: { select: { id: true, nameEn: true, nameBn: true } },
  organization: { select: { id: true, name: true, type: true, logoUrl: true } },
  attachments: { where: { kind: 'PHOTO' as const }, take: 1 },
} satisfies Prisma.InnovationSelect;

@Injectable()
export class RepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchInnovationsDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 12;

    const where: Prisma.InnovationWhereInput = {
      reviewStatus: 'PUBLISHED',
      ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      ...(dto.developmentStage ? { developmentStage: dto.developmentStage } : {}),
      ...(dto.innovationType ? { innovationType: dto.innovationType } : {}),
      ...(dto.fundingSource ? { fundingSource: dto.fundingSource } : {}),
      ...(dto.regionId ? { regionId: dto.regionId } : {}),
      ...(dto.organizationType ? { organization: { type: dto.organizationType } } : {}),
      ...(dto.sdgTagId ? { sdgTags: { some: { sdgTagId: dto.sdgTagId } } } : {}),
      ...(dto.tagId ? { tags: { some: { tagId: dto.tagId } } } : {}),
      ...(dto.q
        ? {
            OR: [
              { titleEn: { contains: dto.q, mode: 'insensitive' } },
              { titleBn: { contains: dto.q, mode: 'insensitive' } },
              { summaryEn: { contains: dto.q, mode: 'insensitive' } },
              { problemStatement: { contains: dto.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.InnovationOrderByWithRelationInput =
      dto.sort === SortOption.POPULAR
        ? { viewCount: 'desc' }
        : dto.sort === SortOption.ALPHABETICAL
          ? { titleEn: 'asc' }
          : { publishedAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.innovation.findMany({
        where,
        select: CARD_SELECT,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.innovation.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async featured(limit = 3) {
    return this.prisma.innovation.findMany({
      where: { reviewStatus: 'PUBLISHED', isFeatured: true },
      select: CARD_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  async related(innovationId: string, limit = 3) {
    const source = await this.prisma.innovation.findUnique({
      where: { id: innovationId },
      select: { categoryId: true },
    });
    if (!source) return [];

    return this.prisma.innovation.findMany({
      where: { reviewStatus: 'PUBLISHED', categoryId: source.categoryId, id: { not: innovationId } },
      select: CARD_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }
}
