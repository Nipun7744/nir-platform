import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { IdGeneratorService } from './services/id-generator.service';
import { IdentityVerificationService } from './services/identity-verification.service';

@Global()
@Module({
  providers: [AuditLogService, IdGeneratorService, IdentityVerificationService],
  exports: [AuditLogService, IdGeneratorService, IdentityVerificationService],
})
export class CommonModule {}
