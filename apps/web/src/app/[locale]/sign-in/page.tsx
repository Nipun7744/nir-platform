'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { AlertCircle } from 'lucide-react';
import { Role, ROLE_LABELS } from '@nir/shared';
import { AuthCard } from '@/components/auth/auth-card';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { useLogin } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api-client';

// Mirrors apps/api/prisma/seed.ts — keep in sync if the demo accounts there change.
const DEMO_ACCOUNTS: { role: Role; email: string }[] = [
  { role: Role.PLATFORM_ADMIN, email: 'admin@nir.gov.bd' },
  { role: Role.INSTITUTIONAL_COORDINATOR, email: 'coordinator@nir.gov.bd' },
  { role: Role.EXPERT_EVALUATOR, email: 'evaluator@nir.gov.bd' },
  { role: Role.EXPERT_EVALUATOR, email: 'evaluator2@nir.gov.bd' },
  { role: Role.EXPERT_EVALUATOR, email: 'evaluator3@nir.gov.bd' },
  { role: Role.EXPERT_EVALUATOR, email: 'evaluator4@nir.gov.bd' },
  { role: Role.PRELIMINARY_REVIEWER, email: 'preliminary@nir.gov.bd' },
  { role: Role.AUTHENTICITY_REVIEWER, email: 'authenticity@nir.gov.bd' },
  { role: Role.INNOVATION_MANAGER, email: 'manager@nir.gov.bd' },
  { role: Role.POLICY_OBSERVER, email: 'policy@nir.gov.bd' },
  { role: Role.INVESTOR, email: 'investor@nir.gov.bd' },
  { role: Role.MENTOR, email: 'mentor@nir.gov.bd' },
  { role: Role.MINISTRY_FOCAL_POINT, email: 'ministry@nir.gov.bd' },
  { role: Role.STAKEHOLDER_PARTNER, email: 'stakeholder@nir.gov.bd' },
  { role: Role.INNOVATION_SUBMITTER, email: 'innovator1@nir.gov.bd' },
  { role: Role.INNOVATION_SUBMITTER, email: 'innovator2@nir.gov.bd' },
  { role: Role.INNOVATION_SUBMITTER, email: 'innovator3@nir.gov.bd' },
];

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
      <div className="mt-4 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
        <p className="text-center font-medium text-ink-600">{t('demoNoteHeader')}</p>
        <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
          {DEMO_ACCOUNTS.map((a) => (
            <div key={a.email} className="flex items-center justify-between gap-3">
              <span className="text-ink-500">{ROLE_LABELS[a.role]}</span>
              <span className="shrink-0 font-mono text-[11px] text-ink-700">{a.email}</span>
            </div>
          ))}
        </div>
      </div>
    </AuthCard>
  );
}
