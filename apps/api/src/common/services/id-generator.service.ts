import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generates system-wide unique identifiers (SRS FR-C1.M1.02):
 * Innovation ID (NIR-YYYY-NNNNNN) and Innovator Recognition Number (IRN-YYYY-NNNNNN).
 */
@Injectable()
export class IdGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async nextInnovationCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.innovation.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `NIR-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async nextIrn(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.innovator.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `IRN-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
