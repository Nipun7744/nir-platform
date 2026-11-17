'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeNextPath, withNext } from '@/lib/safe-next';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { PasswordInput } from '@/components/auth/password-input';
import { CaptchaWidget, type CaptchaHandle } from '@/components/auth/captcha-widget';
import {
  FormAlert,
  FormField,
  RequiredNote,
  StatusMessage,
  authInputCls,
  focusFirstError,
  isValidEmail,
  primaryButtonCls,
  useAuthErrorText,
  type AuthErrorText,
} from '@/components/auth/auth-form';
import { useLogin, useSecurityConfig } from '@/hooks/use-auth';

type Errors = Partial<Record<'email' | 'password' | 'captcha', string>>;

/**
 * Sign-in. Accessibility notes (WCAG 2.2 AA, 2026-11-17 — docs/WCAG-2.2-Accessibility-Report.md):
 * the form validates itself (noValidate) so messages are in the page language, sit next to their
 * field and are tied to it with aria-describedby; the first problem gets focus. The submit button
 * is never `disabled` (a disabled button drops out of the tab order and explains nothing) — while
 * a request is running it is aria-disabled and a live region says "Signing in…".
 */
function SignInPageInner() {
  const t = useTranslations('auth');
  const router = useRouter();
  const login = useLogin();
  const errorText = useAuthErrorText();
  // Return path after sign-in (e.g. a challenge submission page) — validated, same-site only.
  const next = safeNextPath(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<AuthErrorText | null>(null);

  // CAPTCHA on every sign-in attempt. Provider + site key come from the API.
  const { data: security, isError: securityError } = useSecurityConfig();
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = security ? security.captcha.provider !== 'none' : true;
  const busy = login.isPending || !security;

  const validate = (v = { email, password, captchaToken }): Errors => {
    const e: Errors = {};
    if (!v.email.trim()) e.email = t('errEmailRequired');
    else if (!isValidEmail(v.email)) e.email = t('errEmailInvalid');
    if (!v.password) e.password = t('errPasswordRequired');
    if (captchaRequired && !v.captchaToken) e.captcha = t('captchaHint');
    return e;
  };

  // After the first submit attempt, re-check as the user fixes things so stale errors disappear.
  const recheck = (patch: Partial<{ email: string; password: string; captchaToken: string | null }>) => {
    if (attempted) setErrors(validate({ email, password, captchaToken, ...patch }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setAttempted(true);
    setServerError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.email || found.password) focusFirstError([found.email && 'signin-email', found.password && 'signin-password'].filter(Boolean) as string[]);
      else captchaRef.current?.focus();
      return;
    }
    try {
      await login.mutateAsync({ email, password, captchaToken: captchaToken ?? undefined });
      router.push(next ?? '/dashboard');
    } catch (err) {
      setServerError(errorText(err, 'signInFailed'));
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
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <RequiredNote />
        <FormField id="signin-email" label={t('email')} required error={errors.email}>
          {(a11y) => (
            <input
              {...a11y}
              type="email"
              name="email"
              required
              autoComplete="username"
              inputMode="email"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                recheck({ email: e.target.value });
              }}
              className={authInputCls(Boolean(errors.email))}
            />
          )}
        </FormField>
        <FormField id="signin-password" label={t('password')} required error={errors.password}>
          {(a11y) => (
            <PasswordInput
              {...a11y}
              name="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                recheck({ password: e.target.value });
              }}
              className={authInputCls(Boolean(errors.password))}
            />
          )}
        </FormField>

        {security && (
          <CaptchaWidget
            ref={captchaRef}
            id="signin-captcha"
            provider={security.captcha.provider}
            siteKey={security.captcha.siteKey}
            error={errors.captcha}
            onToken={(token) => {
              setCaptchaToken(token);
              recheck({ captchaToken: token });
            }}
          />
        )}
        {securityError && <FormAlert>{t('captchaLoadError')}</FormAlert>}

        <FormAlert lang={serverError?.lang}>{serverError?.text}</FormAlert>

        <button type="submit" aria-disabled={busy || undefined} className={primaryButtonCls}>
          {login.isPending ? t('signingIn') : t('signIn')}
        </button>
        <StatusMessage>{login.isPending ? t('signingIn') : ''}</StatusMessage>
      </form>

      <SsoButtons />

      <p className="mt-6 text-center text-sm text-ink-600">
        {t('noAccount')}{' '}
        <Link
          href={withNext('/register', next)}
          className="focus-ring inline-block rounded py-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
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
