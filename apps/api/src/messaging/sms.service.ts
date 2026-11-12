import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { readEnvChoice, requireEnv } from '../common/utils/env-choice';
import { bdMobileForms } from '../common/utils/phone';

export const SMS_PROVIDERS = ['http', 'console'] as const;
export type SmsProviderKind = (typeof SMS_PROVIDERS)[number];

type BodyEncoding = 'json' | 'form' | 'raw';

/**
 * Outbound SMS. Bangladeshi SMS aggregators (SSL Wireless, BulkSMSBD, Alpha SMS,
 * MiMSMS, Robi/GP/Banglalink/Teletalk enterprise APIs, …) and Twilio each have
 * their own HTTP API, so `SMS_PROVIDER=http` is a template-driven generic client
 * rather than one hard-coded vendor. Placeholders, substituted and escaped for
 * where they appear (URL → URL-encoded, JSON body → JSON-escaped, form body →
 * form-encoded):
 *
 *   {to}         8801XXXXXXXXX   (most BD aggregators)
 *   {to_e164}    +8801XXXXXXXXX  (Twilio and other international APIs)
 *   {to_local}   01XXXXXXXXX
 *   {message}    the SMS text
 *   {ref}        a unique id per message (e.g. SSL Wireless `csms_id`)
 *
 * Env: SMS_HTTP_URL (required), SMS_HTTP_METHOD (default GET, or POST when a body is
 * set), SMS_HTTP_BODY, SMS_HTTP_CONTENT_TYPE (inferred from the body), SMS_HTTP_HEADERS
 * (JSON object, e.g. an Authorization header), SMS_HTTP_SUCCESS_PATTERN (regex the
 * response body must match; default is "any 2xx"). Examples in docs/SETUP.md.
 *
 * `console` (the dev default) only writes the message to the API log.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  readonly kind: SmsProviderKind;
  private readonly http?: {
    url: string;
    method: string;
    body?: string;
    contentType?: string;
    encoding: BodyEncoding;
    headers: Record<string, string>;
    successPattern?: RegExp;
  };

  constructor(config: ConfigService) {
    this.kind = readEnvChoice(config, 'SMS_PROVIDER', SMS_PROVIDERS, 'console');

    if (this.kind === 'http') {
      const url = requireEnv(config, 'SMS_HTTP_URL', 'when SMS_PROVIDER=http');
      const body = config.get<string>('SMS_HTTP_BODY')?.trim() || undefined;
      const contentType =
        config.get<string>('SMS_HTTP_CONTENT_TYPE')?.trim() ||
        (body ? (body.startsWith('{') ? 'application/json' : 'application/x-www-form-urlencoded') : undefined);
      const encoding: BodyEncoding = !contentType
        ? 'raw'
        : contentType.includes('json')
          ? 'json'
          : contentType.includes('x-www-form-urlencoded')
            ? 'form'
            : 'raw';

      let headers: Record<string, string> = {};
      const rawHeaders = config.get<string>('SMS_HTTP_HEADERS')?.trim();
      if (rawHeaders) {
        try {
          headers = JSON.parse(rawHeaders);
        } catch {
          throw new Error('SMS_HTTP_HEADERS must be a JSON object, e.g. {"Authorization":"Bearer …"}');
        }
      }
      const pattern = config.get<string>('SMS_HTTP_SUCCESS_PATTERN')?.trim();

      this.http = {
        url,
        method: (config.get<string>('SMS_HTTP_METHOD')?.trim() || (body ? 'POST' : 'GET')).toUpperCase(),
        body,
        contentType,
        encoding,
        headers,
        successPattern: pattern ? new RegExp(pattern, 'i') : undefined,
      };
    } else if (config.get<string>('NODE_ENV') === 'production') {
      this.logger.warn('SMS_PROVIDER=console in production — SMS (including OTP codes) are only logged, never delivered.');
    }
  }

  /** @param to E.164 BD mobile number (+8801XXXXXXXXX). */
  async send(to: string, message: string): Promise<void> {
    if (!this.http) {
      this.logger.log(`[console sms] to=${to}\n${message}`);
      return;
    }

    const forms = bdMobileForms(to);
    const values: Record<string, string> = {
      to: forms.international,
      to_e164: forms.e164,
      to_local: forms.local,
      message,
      ref: randomUUID().replace(/-/g, ''),
    };
    const fill = (template: string, escape: (v: string) => string) =>
      template.replace(/\{(to|to_e164|to_local|message|ref)\}/g, (_, key: string) => escape(values[key]));

    const url = fill(this.http.url, encodeURIComponent);
    const escapeBody =
      this.http.encoding === 'json'
        ? (v: string) => JSON.stringify(v).slice(1, -1)
        : this.http.encoding === 'form'
          ? encodeURIComponent
          : (v: string) => v;
    const body = this.http.body ? fill(this.http.body, escapeBody) : undefined;

    const response = await fetch(url, {
      method: this.http.method,
      headers: { ...(this.http.contentType ? { 'Content-Type': this.http.contentType } : {}), ...this.http.headers },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();

    // Never log the URL/body — they usually carry the gateway API key.
    if (!response.ok || (this.http.successPattern && !this.http.successPattern.test(text))) {
      throw new Error(`SMS gateway rejected the message (HTTP ${response.status}): ${text.slice(0, 300)}`);
    }
  }
}
