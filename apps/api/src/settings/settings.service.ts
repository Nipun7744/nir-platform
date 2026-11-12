import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';

/** Keys and defaults for PlatformSetting rows. A key with no row yet reads as its default. */
const DEFAULTS = {
  // Defaults to true so existing behaviour (the public /submit form is always open) is preserved
  // until an admin explicitly closes it.
  generalSubmissionEnabled: true,
} as const;

export type SubmissionSettings = { generalSubmissionEnabled: boolean };

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getSubmissionSettings(): Promise<SubmissionSettings> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: 'generalSubmissionEnabled' } });
    return {
      generalSubmissionEnabled: typeof row?.value === 'boolean' ? row.value : DEFAULTS.generalSubmissionEnabled,
    };
  }

  async isGeneralSubmissionEnabled() {
    return (await this.getSubmissionSettings()).generalSubmissionEnabled;
  }

  async updateSubmissionSettings(input: Partial<SubmissionSettings>, actorId: string): Promise<SubmissionSettings> {
    const before = await this.getSubmissionSettings();
    if (input.generalSubmissionEnabled !== undefined && input.generalSubmissionEnabled !== before.generalSubmissionEnabled) {
      await this.prisma.platformSetting.upsert({
        where: { key: 'generalSubmissionEnabled' },
        create: { key: 'generalSubmissionEnabled', value: input.generalSubmissionEnabled, updatedById: actorId },
        update: { value: input.generalSubmissionEnabled, updatedById: actorId },
      });
      await this.auditLog.record({
        actorId,
        action: 'GENERAL_SUBMISSION_TOGGLED',
        entityType: 'PlatformSetting',
        entityId: 'generalSubmissionEnabled',
        metadata: { from: before.generalSubmissionEnabled, to: input.generalSubmissionEnabled },
      });
    }
    return this.getSubmissionSettings();
  }
}
