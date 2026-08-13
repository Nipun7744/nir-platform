import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFaqDto,
  CreateNewsDto,
  CreateChallengeDto,
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
  updateNews(id: string, dto: Partial<CreateNewsDto> & { unpublish?: boolean }) {
    const { unpublish, ...rest } = dto;
    return this.prisma.newsPost.update({
      where: { id },
      data: {
        ...rest,
        eventDate: rest.eventDate ? new Date(rest.eventDate) : undefined,
        publishedAt: unpublish ? null : undefined,
      },
    });
  }
  deleteNews(id: string) {
    return this.prisma.newsPost.delete({ where: { id } });
  }

  // Innovation Challenges / Calls
  challenges() {
    return this.prisma.challenge.findMany({ orderBy: { deadline: 'asc' } });
  }
  async challengeBySlug(slug: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { slug } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }
  async createChallenge(dto: CreateChallengeDto) {
    if (dto.isFeatured) await this.prisma.challenge.updateMany({ data: { isFeatured: false } });
    return this.prisma.challenge.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }
  async updateChallenge(id: string, dto: Partial<CreateChallengeDto>) {
    if (dto.isFeatured) await this.prisma.challenge.updateMany({ where: { id: { not: id } }, data: { isFeatured: false } });
    return this.prisma.challenge.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }
  deleteChallenge(id: string) {
    return this.prisma.challenge.delete({ where: { id } });
  }

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
