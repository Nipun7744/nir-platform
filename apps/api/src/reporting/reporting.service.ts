import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Feeds the homepage "National Statistics" strip — always computed live, never a stale snapshot. */
  async publicStats() {
    const [
      totalInnovations,
      totalInnovators,
      totalOrganizations,
      totalCategories,
      openChallenges,
      fundedAggregate,
    ] = await Promise.all([
      this.prisma.innovation.count({ where: { reviewStatus: 'PUBLISHED' } }),
      this.prisma.innovator.count(),
      this.prisma.organization.count(),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.challenge.count({ where: { status: { in: ['OPEN', 'UPCOMING'] } } }),
      this.prisma.fundDisbursement.aggregate({ _count: { innovationId: true } }),
    ]);

    return {
      totalInnovations,
      totalInnovators,
      totalOrganizations,
      totalCategories,
      openChallenges,
      ideasFunded: fundedAggregate._count.innovationId,
    };
  }

  /** Public category/stage breakdown for the Statistics page — published innovations only. */
  async publicBreakdown() {
    const [byCategory, byStage, byRegion] = await Promise.all([
      this.prisma.innovation.groupBy({
        by: ['categoryId'],
        where: { reviewStatus: 'PUBLISHED' },
        _count: { _all: true },
      }),
      this.prisma.innovation.groupBy({
        by: ['developmentStage'],
        where: { reviewStatus: 'PUBLISHED' },
        _count: { _all: true },
      }),
      this.prisma.innovation.groupBy({
        by: ['regionId'],
        where: { reviewStatus: 'PUBLISHED', regionId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: byCategory.map((c) => c.categoryId) } },
    });
    const regions = await this.prisma.region.findMany({
      where: { id: { in: byRegion.map((r) => r.regionId).filter((id): id is string => Boolean(id)) } },
    });

    return {
      byCategory: byCategory
        .map((c) => ({
          categoryId: c.categoryId,
          nameEn: categories.find((cat) => cat.id === c.categoryId)?.nameEn ?? 'Unknown',
          nameBn: categories.find((cat) => cat.id === c.categoryId)?.nameBn ?? 'Unknown',
          count: c._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      byStage: byStage.map((s) => ({ stage: s.developmentStage, count: s._count._all })),
      byRegion: byRegion
        .map((r) => ({
          regionId: r.regionId,
          nameEn: regions.find((reg) => reg.id === r.regionId)?.nameEn ?? 'Unknown',
          nameBn: regions.find((reg) => reg.id === r.regionId)?.nameBn ?? 'Unknown',
          count: r._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /** SRS FR-C5.M1.05 — internal operational KPIs. */
  async kpis() {
    const evaluations = await this.prisma.evaluation.findMany({
      where: { submittedAt: { not: null } },
      select: { createdAt: true, submittedAt: true },
    });

    const avgReviewTimeDays = evaluations.length
      ? evaluations.reduce((sum, e) => sum + (e.submittedAt!.getTime() - e.createdAt.getTime()), 0) /
        evaluations.length /
        (1000 * 60 * 60 * 24)
      : 0;

    const [publishedCount, scaledOrCommercializedCount, totalCount] = await Promise.all([
      this.prisma.innovation.count({ where: { reviewStatus: 'PUBLISHED' } }),
      this.prisma.innovation.count({
        where: { developmentStage: { in: ['SCALED', 'COMMERCIALIZED'] } },
      }),
      this.prisma.innovation.count(),
    ]);

    const adoptionRate = totalCount ? scaledOrCommercializedCount / totalCount : 0;

    return {
      avgReviewTimeDays: Number(avgReviewTimeDays.toFixed(1)),
      adoptionRate: Number((adoptionRate * 100).toFixed(1)),
      publishedCount,
      totalCount,
    };
  }

  /** SRS FR-C5.M1.02 / M1.03 — fund utilization by source and by category. */
  async fundUtilization() {
    const disbursements = await this.prisma.fundDisbursement.findMany({
      include: { innovation: { select: { categoryId: true, category: { select: { nameEn: true } } } } },
    });

    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const d of disbursements) {
      const amount = Number(d.amount);
      total += amount;
      bySource[d.source] = (bySource[d.source] ?? 0) + amount;
      const categoryName = d.innovation.category.nameEn;
      byCategory[categoryName] = (byCategory[categoryName] ?? 0) + amount;
    }

    return { totalDisbursed: total, bySource, byCategory, count: disbursements.length };
  }

  /** SRS FR-C5.M1.01 — service analytics (submission volumes, approval rate). */
  async serviceAnalytics() {
    const byStatus = await this.prisma.innovation.groupBy({
      by: ['reviewStatus'],
      _count: { _all: true },
    });

    const byCategory = await this.prisma.innovation.groupBy({
      by: ['categoryId'],
      _count: { _all: true },
      where: { reviewStatus: 'PUBLISHED' },
    });

    const categories = await this.prisma.category.findMany({
      where: { id: { in: byCategory.map((c) => c.categoryId) } },
    });

    return {
      byStatus: byStatus.map((s) => ({ status: s.reviewStatus, count: s._count._all })),
      byCategory: byCategory.map((c) => ({
        categoryId: c.categoryId,
        categoryName: categories.find((cat) => cat.id === c.categoryId)?.nameEn ?? 'Unknown',
        count: c._count._all,
      })),
    };
  }

  /** SRS FR-C5.M1.04 — on-demand custom report as CSV. */
  async exportInnovationsCsv(filters: { ministryId?: string; categoryId?: string }): Promise<string> {
    const rows = await this.prisma.innovation.findMany({
      where: {
        ...(filters.ministryId ? { ministryId: filters.ministryId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      },
      select: {
        innovationCode: true,
        titleEn: true,
        reviewStatus: true,
        developmentStage: true,
        category: { select: { nameEn: true } },
        organization: { select: { name: true } },
        createdAt: true,
      },
    });

    const header = 'Innovation Code,Title,Status,Development Stage,Category,Organization,Created At';
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        r.innovationCode,
        escape(r.titleEn),
        r.reviewStatus,
        r.developmentStage,
        escape(r.category.nameEn),
        escape(r.organization?.name ?? ''),
        r.createdAt.toISOString(),
      ].join(','),
    );

    return [header, ...lines].join('\n');
  }
}
