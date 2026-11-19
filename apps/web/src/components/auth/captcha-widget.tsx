'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, RotateCw } from 'lucide-react';
import type { CaptchaProvider } from '@/hooks/use-auth';

/**
 * One component for Cloudflare Turnstile, Google reCAPTCHA v2 and hCaptcha — their browser
 * APIs share the same shape: `render(el, { sitekey, callback, 'expired-callback',
 * 'error-callback' }) → widgetId`, plus `reset(widgetId)`. Which one is used (and its public
 * site key) comes from the API's GET /auth/security-config. Tokens are single-use: call
 * `reset()` after every submit, successful or not.
 */

type Provider = Exclude<CaptchaProvider, 'none'>;

interface WidgetApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string | number;
  reset: (id?: string | number) => void;
  remove?: (id: string | number) => void;
}

const SCRIPTS: Record<Provider, { src: (locale: string) => string; global: string }> = {
  turnstile: { src: () => 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', global: 'turnstile' },
  recaptcha: { src: (hl) => `https://www.google.com/recaptcha/api.js?render=explicit&hl=${hl}`, global: 'grecaptcha' },
  hcaptcha: { src: (hl) => `https://js.hcaptcha.com/1/api.js?render=explicit&hl=${hl}`, global: 'hcaptcha' },
};

const loaders = new Map<Provider, Promise<WidgetApi>>();

function loadProvider(provider: Provider, locale: string): Promise<WidgetApi> {
  const existing = loaders.get(provider);
  if (existing) return existing;

  const { src, global } = SCRIPTS[provider];
  const promise = new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src(locale);
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loaders.delete(provider);
      reject(new Error('captcha script failed to load'));
    };
    document.head.appendChild(script);

    // `onload` fires before reCAPTCHA has finished initializing, so poll for a usable `render`.
    const started = Date.now();
    const poll = () => {
      const api = (window as unknown as Record<string, WidgetApi | undefined>)[global];
      if (api && typeof api.render === 'function') return resolve(api);
      if (Date.now() - started > 20_000) {
        loaders.delete(provider);
        return reject(new Error('captcha script timed out'));
      }
      setTimeout(poll, 100);
    };
    poll();
  });
  loaders.set(provider, promise);
  return promise;
}

export interface CaptchaHandle {
  /** Clear the current token and show a fresh challenge. */
  reset: () => void;
  /** Move keyboard focus to the security-check group (used when it is the first error). */
  focus: () => void;
}

interface Props {
  provider: CaptchaProvider;
  siteKey: string | null;
  onToken: (token: string | null) => void;
  /** Validation message shown under the widget (e.g. "Complete the security check…"). */
  error?: string | null;
  /** id for the group; its error gets `${id}-error`. */
  id?: string;
}

type CaptchaStatus = 'idle' | 'done' | 'expired' | 'failed';

/**
 * Accessibility (2026-11-17, WCAG 2.2 AA): the third-party widget sits in a labelled group
 * ("Security check", 1.3.1 / 2.4.6) that can take focus when it is the first problem in a form
 * (3.3.1); its outcome — completed, expired, failed — is announced through a polite live region
 * (4.1.3); a load failure offers a "Try again" button instead of only "refresh the page"; and the
 * provider widgets themselves are localised (bn/en). Turnstile is usually non-interactive and
 * reCAPTCHA / hCaptcha offer audio / accessibility alternatives, which is what 3.3.8 asks of a
 * CAPTCHA (WCAG 2.2 report: git commit 814b8e5).
 */
export const CaptchaWidget = forwardRef<CaptchaHandle, Props>(function CaptchaWidget({ provider, siteKey, onToken, error, id = 'captcha' }, ref) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<WidgetApi | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const groupRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<CaptchaStatus>('idle');

  useImperativeHandle(ref, () => ({
    focus: () => groupRef.current?.focus(),
    reset: () => {
      onTokenRef.current(null);
      setStatus('idle');
      if (apiRef.current && widgetIdRef.current !== null) {
        try {
          apiRef.current.reset(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
      }
    },
  }));

  useEffect(() => {
    if (provider === 'none' || !siteKey || !containerRef.current) return;
    let cancelled = false;
    // A fresh child element per mount: reCAPTCHA refuses to render twice into the same node
    // (which React strict mode's double-mount would otherwise trigger).
    const host = document.createElement('div');
    containerRef.current.appendChild(host);

    loadProvider(provider, locale === 'bn' ? 'bn' : 'en')
      .then((api) => {
        if (cancelled) return;
        apiRef.current = api;
        widgetIdRef.current = api.render(host, {
          sitekey: siteKey,
          callback: (token: string) => {
            onTokenRef.current(token);
            setStatus('done');
          },
          'expired-callback': () => {
            onTokenRef.current(null);
            setStatus('expired');
          },
          'error-callback': () => {
            onTokenRef.current(null);
            setStatus('failed');
          },
          ...(provider === 'turnstile' ? { language: locale === 'bn' ? 'bn' : 'en' } : {}),
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      const api = apiRef.current;
      const id = widgetIdRef.current;
      if (api?.remove && id !== null) {
        try {
          api.remove(id);
        } catch {
          /* ignore */
        }
      }
      widgetIdRef.current = null;
      host.remove();
      onTokenRef.current(null);
    };
  }, [provider, siteKey, locale, attempt]);

  if (provider === 'none') return null;

  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const statusText =
    status === 'done' ? t('captchaDone') : status === 'expired' ? t('captchaExpired') : status === 'failed' ? t('captchaFailed') : '';

  return (
    <div
      ref={groupRef}
      id={id}
      role="group"
      tabIndex={-1}
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      className="focus-ring scroll-mt-36 rounded-lg"
    >
      <p className="mb-1.5 text-sm font-medium text-ink-700">
        <span id={labelId}>{t('captchaLabel')}</span>
        <span aria-hidden="true" className="text-red-700"> *</span>
      </p>
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      {/* Polite: completion / expiry is news, not an interruption. */}
      <p role="status" className={status === 'expired' || status === 'failed' ? 'mt-1 text-sm text-red-700' : 'sr-only'}>
        {statusText}
      </p>
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {failed && (
        <div role="alert" className="mt-1.5 space-y-2">
          <p className="flex items-start gap-1.5 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('captchaLoadError')}
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
            className="focus-ring inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-ink-400 px-4 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {t('captchaRetry')}
          </button>
        </div>
      )}
    </div>
  );
});
