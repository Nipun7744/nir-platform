import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generates system-wide unique identifiers (SRS FR-C1.M1.02):
 * Innovation ID (NIR-YYYY-NNNNNN) and Innovator Recognition Number (IRN-YYYY-NNNNNN).
 *
 * The running number is taken from the highest code already issued for the year, not a
 * row count: a count desyncs from the real high-water mark the moment any row is deleted
 * or seed data assigns non-contiguous codes, after which every insert collides on the
 * unique constraint and the count can never advance (see docs/ROADMAP.md known issues).
 * The fixed-width zero-padded suffix makes a lexical `desc` sort equivalent to numeric.
 */
@Injectable()
export class IdGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async nextInnovationCode(): Promise<string> {
    const prefix = `NIR-${new Date().getFullYear()}-`;
    const latest = await this.prisma.innovation.findFirst({
      where: { innovationCode: { startsWith: prefix } },
      orderBy: { innovationCode: 'desc' },
      select: { innovationCode: true },
    });
    const next = (latest ? parseInt(latest.innovationCode.slice(prefix.length), 10) : 0) + 1;
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  async nextIrn(): Promise<string> {
    const prefix = `IRN-${new Date().getFullYear()}-`;
    const latest = await this.prisma.innovator.findFirst({
      where: { irn: { startsWith: prefix } },
      orderBy: { irn: 'desc' },
      select: { irn: true },
    });
    const next = (latest ? parseInt(latest.irn.slice(prefix.length), 10) : 0) + 1;
    return `${prefix}${String(next).padStart(6, '0')}`;
  }
}
