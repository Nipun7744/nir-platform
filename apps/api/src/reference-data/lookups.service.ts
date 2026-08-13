import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, CreateSdgTagDto, CreateRegionDto, CreateMinistryDto } from './dto/reference-data.dto';

/** Simple admin-managed lookups: Tags, SDG Tags, Regions, Ministries (SRS FR-C4.M2.11). */
@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tags
  findTags(type?: 'THEMATIC' | 'TECHNOLOGY') {
    return this.prisma.tag.findMany({ where: { isActive: true, ...(type ? { type } : {}) } });
  }
  createTag(dto: CreateTagDto) {
    return this.prisma.tag.create({ data: dto });
  }

  // SDG Tags
  findSdgTags() {
    return this.prisma.sdgTag.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  }
  createSdgTag(dto: CreateSdgTagDto) {
    return this.prisma.sdgTag.create({ data: dto });
  }

  // Regions
  findRegions() {
    return this.prisma.region.findMany({ where: { isActive: true }, orderBy: { nameEn: 'asc' } });
  }
  createRegion(dto: CreateRegionDto) {
    return this.prisma.region.create({ data: dto });
  }

  // Ministries
  findMinistries() {
    return this.prisma.ministry.findMany({ where: { isActive: true }, orderBy: { nameEn: 'asc' } });
  }
  createMinistry(dto: CreateMinistryDto) {
    return this.prisma.ministry.create({ data: dto });
  }
}
