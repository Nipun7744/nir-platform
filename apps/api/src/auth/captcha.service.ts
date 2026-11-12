import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readEnvChoice, requireEnv } from '../common/utils/env-choice';

export const CAPTCHA_PROVIDERS = ['turnstile', 'recaptcha', 'hcaptcha', 'none'] as const;
export type CaptchaProvider = (typeof CAPTCHA_PROVIDERS)[number];

// All three providers share the same server-side contract: POST form-encoded
// `secret` + `response` (+ optional `remoteip`) → JSON `{ success: boolean, ... }`.
const VERIFY_URLS: Record<Exclude<CaptchaProvider, 'none'>, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify', // reCAPTCHA v2 ("I'm not a robot" checkbox)
  hcaptcha: 'https://api.hcaptcha.com/siteverify',
};

/**
 * Server-side CAPTCHA verification (required on every login and every OTP send).
 * `CAPTCHA_PROVIDER=none` disables it — the dev default when the variable is unset,
 * and only allowed in production if set explicitly.
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  readonly provider: CaptchaProvider;
  /** Public — handed to the browser widget. */
  readonly siteKey: string | null;
  private readonly secretKey: string | null;

  constructor(config: ConfigService) {
    this.provider = readEnvChoice(config, 'CAPTCHA_PROVIDER', CAPTCHA_PROVIDERS, 'none');
    if (this.provider === 'none') {
      this.siteKey = null;
      this.secretKey = null;
      const level = config.get<string>('NODE_ENV') === 'production' ? 'warn' : 'log';
      this.logger[level]('CAPTCHA is disabled (CAPTCHA_PROVIDER=none) — logins are not CAPTCHA-protected.');
    } else {
      this.siteKey = requireEnv(config, 'CAPTCHA_SITE_KEY', `when CAPTCHA_PROVIDER=${this.provider}`);
      this.secretKey = requireEnv(config, 'CAPTCHA_SECRET_KEY', `when CAPTCHA_PROVIDER=${this.provider}`);
    }
  }

  get enabled(): boolean {
    return this.provider !== 'none';
  }

  /** Throws 400 if the token is missing/invalid, 503 if the provider can't be reached (fails closed). */
  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    if (this.provider === 'none') return;
    if (!token) throw new BadRequestException('Please complete the CAPTCHA check.');

    const form = new URLSearchParams({ secret: this.secretKey!, response: token });
    if (remoteIp) form.set('remoteip', remoteIp);

    let result: { success?: boolean; 'error-codes'?: string[] };
    try {
      const response = await fetch(VERIFY_URLS[this.provider], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(8_000),
      });
      result = (await response.json()) as typeof result;
    } catch (error) {
      this.logger.error(`CAPTCHA verification request to ${this.provider} failed`, error as Error);
      throw new ServiceUnavailableException('CAPTCHA verification is temporarily unavailable. Please try again.');
    }

    if (result.success !== true) {
      this.logger.warn(`CAPTCHA rejected: ${(result['error-codes'] ?? []).join(', ') || 'no error code'}`);
      throw new BadRequestException('CAPTCHA verification failed. Please try again.');
    }
  }
}
