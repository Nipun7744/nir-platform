'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { AlertCircle } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { useLogin } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api-client';

export default function SignInPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      router.push('/dashboard');
    } catch {
      /* surfaced via login.isError below */
    }
  };

  return (
    <AuthCard title={t('signInTitle')} subtitle={t('signInSubtitle')}>
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
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>

        {login.isError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {login.error instanceof ApiError ? login.error.message : 'Sign in failed'}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="focus-ring w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {login.isPending ? '…' : t('signIn')}
        </button>
      </form>

      <SsoButtons />

      <p className="mt-6 text-center text-sm text-ink-500">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          {t('createOne')}
        </Link>
      </p>
    </AuthCard>
  );
}
