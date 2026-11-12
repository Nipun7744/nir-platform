'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
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
}

interface Props {
  provider: CaptchaProvider;
  siteKey: string | null;
  onToken: (token: string | null) => void;
}

export const CaptchaWidget = forwardRef<CaptchaHandle, Props>(function CaptchaWidget({ provider, siteKey, onToken }, ref) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<WidgetApi | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
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
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
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
  }, [provider, siteKey, locale]);

  if (provider === 'none') return null;

  return (
    <div>
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      {failed && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('captchaLoadError')}
        </p>
      )}
    </div>
  );
});
