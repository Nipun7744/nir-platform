'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeNextPath, withNext } from '@/lib/safe-next';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { PasswordInput } from '@/components/auth/password-input';
import { CaptchaWidget, type CaptchaHandle } from '@/components/auth/captcha-widget';
import { useLogin, useSecurityConfig } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api-client';

function SignInPageInner() {
  const t = useTranslations('auth');
  const router = useRouter();
  const login = useLogin();
  // Return path after sign-in (e.g. a challenge submission page) — validated, same-site only.
  const next = safeNextPath(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // CAPTCHA on every sign-in attempt. Provider + site key come from the API.
  const { data: security, isError: securityError } = useSecurityConfig();
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = security ? security.captcha.provider !== 'none' : true;
  const canSubmit = Boolean(security) && (!captchaRequired || Boolean(captchaToken)) && !login.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await login.mutateAsync({ email, password, captchaToken: captchaToken ?? undefined });
      router.push(next ?? '/dashboard');
    } catch {
      /* surfaced via login.isError below */
      // Tokens are single-use — every failed attempt needs a fresh check.
      captchaRef.current?.reset();
    }
  };

  return (
    <AuthCard title={t('signInTitle')} subtitle={t('signInSubtitle')}>
      {next?.startsWith('/challenges/') && (
        <p className="mb-4 rounded-lg border border-brand-300/60 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {t('signInChallengeHint')}
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('email')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('password')}</label>
          <PasswordInput
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>

        {security && (
          <CaptchaWidget
            ref={captchaRef}
            provider={security.captcha.provider}
            siteKey={security.captcha.siteKey}
            onToken={setCaptchaToken}
          />
        )}
        {securityError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {t('captchaLoadError')}
          </p>
        )}

        {login.isError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {login.error instanceof ApiError ? login.error.message : 'Sign in failed'}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="focus-ring w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {login.isPending ? '…' : t('signIn')}
        </button>
        {security && captchaRequired && !captchaToken && !login.isPending && (
          <p className="text-center text-xs text-ink-500">{t('captchaHint')}</p>
        )}
      </form>

      <SsoButtons />

      <p className="mt-6 text-center text-sm text-ink-500">
        {t('noAccount')}{' '}
        <Link href={withNext('/register', next)} className="font-semibold text-brand-700 hover:underline">
          {t('createOne')}
        </Link>
      </p>
    </AuthCard>
  );
}

// useSearchParams (the post-login `next` return path) needs a Suspense boundary in the App Router.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageInner />
    </Suspense>
  );
}
