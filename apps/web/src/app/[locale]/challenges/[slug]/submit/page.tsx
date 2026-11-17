'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, Trophy } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useMutation } from '@tanstack/react-query';
import { useChallengeForm } from '@/hooks/use-content';
import { useAuthStore } from '@/store/auth-store';
import { api, ApiError } from '@/lib/api-client';
import { DynamicForm, validateDynamicForm } from '@/components/challenge-form/dynamic-form';
import { useTranslations } from 'next-intl';
import { useChallengeText } from '@/lib/challenge-i18n';
import { visibleValues, type FormValues } from '@/components/challenge-form/types';

interface SubmitResult {
  id: string;
  innovationCode: string;
  titleEn: string;
  challenge: { slug: string; titleEn: string };
}

export default function ChallengeSubmitPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useChallengeForm(slug);
  const t = useTranslations('challenges.submit');
  const tForm = useTranslations('challenges.form');
  const tClosed = useTranslations('challenges.closed');
  const tCommon = useTranslations('common');
  const tx = useChallengeText();

  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Challenge submissions require an account — send anonymous visitors to sign in and bring them
  // straight back here afterwards (the `next` param survives sign-in and the register round-trip).
  const returnTo = `/challenges/${slug}/submit`;
  useEffect(() => {
    if (hasHydrated && !accessToken) router.replace(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }, [hasHydrated, accessToken, router, returnTo]);

  const submit = useMutation({
    mutationFn: (responses: FormValues) => api.post<SubmitResult>(`/challenges/${slug}/submissions`, { responses }),
    onSuccess: (r) => {
      setResult(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      const fieldErrors = (err instanceof ApiError && (err.details as { fieldErrors?: Record<string, string> })?.fieldErrors) || null;
      if (fieldErrors) setErrors(fieldErrors);
    },
  });

  if (!hasHydrated || !accessToken) {
    return <div className="container-page py-24 text-center text-ink-400">{t('checkingSession')}</div>;
  }
  if (isLoading) return <div className="container-page py-24 text-center text-ink-400">{tCommon('loading')}</div>;
  if (isError || !data) return <div className="container-page py-24 text-center text-ink-400">{t('notFound')}</div>;

  const { challenge, fields } = data;
  const title = tx.title(challenge);

  const banner = (
    <div className="rounded-2xl border border-brand-300/60 bg-brand-50 px-5 py-4">
      <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
        <Trophy className="h-4 w-4" /> {t('banner')}
      </p>
      <p className="mt-1 font-display text-lg font-bold text-ink-900">{title}</p>
      <p className="text-sm text-ink-600">{tx.organizer(challenge)}</p>
    </div>
  );

  if (result) {
    return (
      <div className="container-page max-w-3xl py-14">
        {banner}
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">{t('successTitle')}</h1>
          <p className="mt-2 text-ink-600">{t('successBody', { title: result.titleEn, challenge: title })}</p>
          <p className="mt-1 font-mono text-sm text-ink-500">{t('reference', { code: result.innovationCode })}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/dashboard/innovations/${result.id}`} className="focus-ring rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              {t('track')}
            </Link>
            <Link href={`/challenges/${slug}`} className="focus-ring rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-ink-400">
              {t('back')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validateDynamicForm(fields, values, tForm, tx.locale);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      document.getElementById(`cf-${Object.keys(clientErrors)[0]}`)?.focus();
      return;
    }
    submit.mutate(visibleValues(fields, values));
  };

  const generalError =
    submit.isError && !(submit.error instanceof ApiError && (submit.error.details as any)?.fieldErrors)
      ? submit.error instanceof ApiError
        ? submit.error.message
        : t('genericError')
      : submit.isError
        ? t('fixFields')
        : null;

  return (
    <div className="container-page max-w-3xl py-14">
      <Link href={`/challenges/${slug}`} className="focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>
      <h1 className="font-display text-3xl font-extrabold text-ink-900">{t('heading', { title })}</h1>
      <div className="mt-5">{banner}</div>

      {!challenge.acceptingSubmissions ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
          <div>
            <p className="font-semibold text-ink-900">{t('closedTitle')}</p>
            <p className="mt-1 text-sm text-ink-600">
              {challenge.closedCode && tClosed.has(challenge.closedCode) ? tClosed(challenge.closedCode) : challenge.closedReason}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <p className="text-sm text-ink-500">
            {t('signedInAs', { name: user?.fullName ?? '' })} {t('requiredNote')}
          </p>
          <DynamicForm
            fields={fields}
            values={values}
            errors={errors}
            onChange={(key, value) => {
              setValues((v) => ({ ...v, [key]: value }));
              if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
            }}
          />

          <label className="flex items-start gap-2.5 border-t border-ink-100 pt-5 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded-sm border-2 border-ink-400 text-brand-600"
            />
            <span>
              {t('terms')} <span className="text-red-600">*</span>
            </span>
          </label>

          {generalError && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {generalError}
            </p>
          )}

          <button
            type="submit"
            disabled={submit.isPending || !termsAccepted}
            className="focus-ring w-full rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
          >
            {submit.isPending ? t('submitting') : tx.submitLabel(challenge, t('submitTo', { title }))}
          </button>
          <p className="text-xs text-ink-400">{t('footNote')}</p>
        </form>
      )}
    </div>
  );
}
