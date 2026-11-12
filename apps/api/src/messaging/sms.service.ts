import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt, randomUUID } from 'crypto';
import { readEnvChoice, requireEnv } from '../common/utils/env-choice';
import { bdMobileForms, maskPhone } from '../common/utils/phone';

export const SMS_PROVIDERS = ['teletalk', 'http', 'console'] as const;
export type SmsProviderKind = (typeof SMS_PROVIDERS)[number];

type BodyEncoding = 'json' | 'form' | 'raw';

const md5 = (value: string) => createHash('md5').update(value, 'utf8').digest('hex');

/** 16 random digits, no leading zero (Teletalk `p_key`; their PHP sample builds it from time() + rand()). */
function teletalkPKey(): string {
  let key = String(randomInt(1, 10));
  while (key.length < 16) key += String(randomInt(0, 10));
  return key;
}

/**
 * Teletalk's request authentication: `a_key = md5((p_key + user_id) . '****')`. In their PHP
 * sample `+` is *numeric* addition of the two digit strings, so BigInt keeps the 16-digit
 * sum exact; `'****'` is a literal suffix, not a redacted secret (confirmed against the live gateway).
 */
export function teletalkAKey(pKey: string, userId: string): string {
  return md5(`${(BigInt(pKey) + BigInt(userId)).toString()}****`);
}

interface TeletalkConfig {
  url: string;
  user: string;
  userId: string;
  passHash: string;
  serverName: string;
  smsClass: string;
  smsId: string;
  charset: string;
  validity: string;
}

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
 * `teletalk` is the Teletalk Bulk SMS JSON API (bulksms1.teletalk.com.bd), the gateway NIR
 * uses. It needs per-message computed fields (md5 password, random p_key, a_key), which a
 * static template can't express. Env: SMS_TELETALK_USER, SMS_TELETALK_USER_ID,
 * SMS_TELETALK_PASSWORD (required; sent only as md5), plus optional SMS_TELETALK_URL,
 * _SERVERNAME, _SMS_CLASS, _SMS_ID, _CHARSET, _VALIDITY (defaults = Teletalk's sample).
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
  private readonly teletalk?: TeletalkConfig;

  constructor(config: ConfigService) {
    this.kind = readEnvChoice(config, 'SMS_PROVIDER', SMS_PROVIDERS, 'console');
    const opt = (key: string, fallback: string) => config.get<string>(key)?.trim() || fallback;

    if (this.kind === 'teletalk') {
      const why = 'when SMS_PROVIDER=teletalk';
      const userId = requireEnv(config, 'SMS_TELETALK_USER_ID', why);
      if (!/^\d+$/.test(userId)) throw new Error('SMS_TELETALK_USER_ID must be numeric (it is added to p_key for a_key).');
      this.teletalk = {
        url: opt('SMS_TELETALK_URL', 'http://bulksms1.teletalk.com.bd:8091/jlinktbls.php'),
        user: requireEnv(config, 'SMS_TELETALK_USER', why),
        userId,
        passHash: md5(requireEnv(config, 'SMS_TELETALK_PASSWORD', why)),
        serverName: opt('SMS_TELETALK_SERVERNAME', 'bulksms1.teletalk.com.bd'),
        smsClass: opt('SMS_TELETALK_SMS_CLASS', 'OTP'),
        smsId: opt('SMS_TELETALK_SMS_ID', '44'),
        charset: opt('SMS_TELETALK_CHARSET', 'ASCII|ASCII|UTF-8|ASCII'),
        validity: opt('SMS_TELETALK_VALIDITY', '1440'),
      };
    } else if (this.kind === 'http') {
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
    if (this.teletalk) return this.sendTeletalk(to, message);
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

  private async sendTeletalk(to: string, message: string): Promise<void> {
    const t = this.teletalk!;
    const pKey = teletalkPKey();
    const cid = String(randomInt(1_000_000_000, 10_000_000_000)); // 10-digit client ref, echoed back
    const payload = {
      op: 'SMS',
      chunk: 'V',
      user: t.user,
      user_id: t.userId,
      pass: t.passHash,
      servername: t.serverName,
      smsclass: t.smsClass,
      sms: message,
      sms_id: t.smsId,
      mobile: bdMobileForms(to).local,
      charset: t.charset,
      validity: t.validity,
      p_key: pKey,
      a_key: teletalkAKey(pKey, t.userId),
      cid,
    };

    const response = await fetch(t.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();

    let reply: { status?: string; scode?: string; details?: string } = {};
    try {
      reply = JSON.parse(text);
    } catch {
      /* non-JSON reply: handled below */
    }
    // Success looks like {"status":"SUCCESS","scode":"1","details":"TOTAL VALID RECORD=1|M=880…,ID=…"}.
    // The reply never echoes credentials, so it is safe to include in the error.
    if (!response.ok || String(reply.status).toUpperCase() !== 'SUCCESS') {
      throw new Error(`Teletalk SMS rejected (HTTP ${response.status}): ${text.slice(0, 300)}`);
    }
    const gatewayId = /ID=([^,|]+)/.exec(reply.details ?? '')?.[1] ?? '?';
    this.logger.log(`[teletalk] sent to ${maskPhone(to)} cid=${cid} id=${gatewayId}`);
  }
}
