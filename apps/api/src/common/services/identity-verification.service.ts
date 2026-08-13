import { Injectable, Logger } from '@nestjs/common';

/**
 * MOCKED integration point for NID/Birth Registration verification (ToR §8.1)
 * and BIN verification (SRS FR-C2.M1.01). These are real Bangladesh government
 * APIs (Election Commission / LGD, National Board of Revenue) this environment
 * has no credentials for. Both methods currently accept any well-formed input
 * and return a deterministic "verified" result so the rest of the app can be
 * built and tested against a stable interface — swap the body for a real API
 * call when credentials are available.
 */
@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

  async verifyNid(nidOrBrc: string): Promise<{ verified: boolean; reason?: string }> {
    this.logger.log(`[MOCK NID/BRC verification] ${nidOrBrc}`);
    const isPlausible = /^\d{10}$|^\d{13}$|^\d{17}$/.test(nidOrBrc.trim());
    return isPlausible ? { verified: true } : { verified: false, reason: 'Invalid NID/BRC format' };
  }

  async verifyBin(bin: string): Promise<{ verified: boolean; reason?: string }> {
    this.logger.log(`[MOCK BIN verification] ${bin}`);
    const isPlausible = /^\d{9,13}$/.test(bin.trim());
    return isPlausible ? { verified: true } : { verified: false, reason: 'Invalid BIN format' };
  }
}
