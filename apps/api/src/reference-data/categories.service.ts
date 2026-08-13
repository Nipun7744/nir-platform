import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  create(data: {
    slug: string;
    icon: string;
    nameEn: string;
    nameBn: string;
    descriptionEn: string;
    descriptionBn?: string;
    examplesEn?: string;
    sortOrder?: number;
  }) {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Partial<Parameters<CategoriesService['create']>[0]> & { isActive?: boolean }) {
    return this.prisma.category.update({ where: { id }, data });
  }
}
