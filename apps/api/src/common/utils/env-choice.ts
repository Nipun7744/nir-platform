import { ConfigService } from '@nestjs/config';

/**
 * Read an env var that selects between integrations (e.g. `CAPTCHA_PROVIDER`).
 *
 * Outside production an unset value falls back to `devDefault` (a no-op/console
 * mode) so local dev works with zero config. In production (`NODE_ENV=production`,
 * which both Dockerfiles set) an unset value is a startup error: security
 * integrations must be chosen deliberately — to switch one off in production you
 * have to say so explicitly (e.g. `CAPTCHA_PROVIDER=none`), never by omission.
 */
export function readEnvChoice<T extends string>(
  config: ConfigService,
  key: string,
  allowed: readonly T[],
  devDefault: T,
): T {
  const raw = config.get<string>(key)?.trim().toLowerCase();
  if (!raw) {
    if (config.get<string>('NODE_ENV') === 'production') {
      throw new Error(
        `${key} must be set in production (one of: ${allowed.join(', ')}). See docs/SETUP.md § Registration OTP & login CAPTCHA.`,
      );
    }
    return devDefault;
  }
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new Error(`${key}="${raw}" is not valid — expected one of: ${allowed.join(', ')}`);
  }
  return raw as T;
}

export function requireEnv(config: ConfigService, key: string, because: string): string {
  const value = config.get<string>(key)?.trim();
  if (!value) throw new Error(`${key} is required ${because}`);
  return value;
}

export function readIntEnv(config: ConfigService, key: string, fallback: number, min = 1): number {
  const raw = config.get<string>(key);
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) throw new Error(`${key}="${raw}" must be an integer >= ${min}`);
  return n;
}
