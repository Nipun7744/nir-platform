import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFaqDto,
  CreateNewsDto,
  UpdateNewsDto,
  CreateResourceDto,
  CreatePartnerDto,
  CreateFeedbackDto,
} from './dto/public-content.dto';

@Injectable()
export class PublicContentService {
  constructor(private readonly prisma: PrismaService) {}

  // FAQ
  faqs() {
    return this.prisma.faqItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }
  faqsForAdmin() {
    return this.prisma.faqItem.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  createFaq(dto: CreateFaqDto) {
    return this.prisma.faqItem.create({ data: dto });
  }
  updateFaq(id: string, dto: Partial<CreateFaqDto> & { isActive?: boolean }) {
    return this.prisma.faqItem.update({ where: { id }, data: dto });
  }
  deleteFaq(id: string) {
    return this.prisma.faqItem.delete({ where: { id } });
  }

  // News & Events
  async news(page = 1, pageSize = 9) {
    const where = { publishedAt: { not: null } };
    const [items, total] = await Promise.all([
      this.prisma.newsPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.newsPost.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
  async newsBySlug(slug: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { slug } });
    if (!post) throw new NotFoundException('News post not found');
    return post;
  }
  newsForAdmin() {
    return this.prisma.newsPost.findMany({ orderBy: { createdAt: 'desc' } });
  }
  createNews(dto: CreateNewsDto) {
    return this.prisma.newsPost.create({
      data: {
        ...dto,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        publishedAt: new Date(),
      },
    });
  }
  async updateNews(id: string, dto: UpdateNewsDto) {
    const existing = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('News post not found');

    const { unpublish, ...rest } = dto;
    try {
      return await this.prisma.newsPost.update({
        where: { id },
        data: {
          ...rest,
          eventDate: rest.eventDate ? new Date(rest.eventDate) : undefined,
          // `unpublish` is the only thing allowed to touch publish status — a plain field edit
          // (unpublish omitted/false) leaves publishedAt untouched, so editing a published post
          // doesn't accidentally unpublish it, and editing an unpublished one doesn't republish it.
          publishedAt: unpublish ? null : undefined,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('That slug is already in use by another post');
      }
      throw err;
    }
  }
  deleteNews(id: string) {
    return this.prisma.newsPost.delete({ where: { id } });
  }

  // Innovation Challenges / Calls — moved to challenges/challenges.service.ts (2026-11-10).

  // Resources
  resources(type?: string) {
    return this.prisma.resourceDocument.findMany({
      where: type ? { type: type as any } : {},
      orderBy: { publishedAt: 'desc' },
    });
  }
  createResource(dto: CreateResourceDto) {
    return this.prisma.resourceDocument.create({ data: dto });
  }
  updateResource(id: string, dto: Partial<CreateResourceDto>) {
    return this.prisma.resourceDocument.update({ where: { id }, data: dto });
  }
  deleteResource(id: string) {
    return this.prisma.resourceDocument.delete({ where: { id } });
  }

  // Partners
  partners() {
    return this.prisma.partner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }
  partnersForAdmin() {
    return this.prisma.partner.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  createPartner(dto: CreatePartnerDto) {
    return this.prisma.partner.create({ data: dto });
  }
  updatePartner(id: string, dto: Partial<CreatePartnerDto> & { isActive?: boolean }) {
    return this.prisma.partner.update({ where: { id }, data: dto });
  }
  deletePartner(id: string) {
    return this.prisma.partner.delete({ where: { id } });
  }

  // Feedback & Grievance
  createFeedback(dto: CreateFeedbackDto, userId?: string) {
    return this.prisma.feedbackGrievance.create({ data: { ...dto, userId } });
  }
  feedbackList() {
    return this.prisma.feedbackGrievance.findMany({ orderBy: { createdAt: 'desc' } });
  }
  updateFeedbackStatus(id: string, status: string) {
    return this.prisma.feedbackGrievance.update({ where: { id }, data: { status } });
  }
}
