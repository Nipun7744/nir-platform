'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeNextPath, withNext } from '@/lib/safe-next';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, Smartphone } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { CaptchaWidget, type CaptchaHandle } from '@/components/auth/captcha-widget';
import { useRegister, useSecurityConfig, useSendOtp, type OtpChannel, type OtpSent } from '@/hooks/use-auth';
import { useCategories, useMinistries, useTags } from '@/hooks/use-content';
import { ApiError } from '@/lib/api-client';

type DesiredRole = 'INNOVATION_SUBMITTER' | 'INVESTOR' | 'MENTOR' | 'MINISTRY_FOCAL_POINT';

function ChipSelect({ options, selected, onToggle }: { options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-300'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RegisterPageInner() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const register = useRegister();
  // Carried through from a challenge "Submit Innovation" click so the sign-in link after
  // registration (and admin approval) returns the user to that challenge.
  const next = safeNextPath(useSearchParams().get('next'));
  const { data: ministries } = useMinistries();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [role, setRole] = useState<DesiredRole>('INNOVATION_SUBMITTER');

  // Investor-only fields
  const [organizationName, setOrganizationName] = useState('');
  const [binNumber, setBinNumber] = useState('');
  const [sectorInterestIds, setSectorInterestIds] = useState<string[]>([]);

  // Mentor-only fields
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState('');
  const [expertiseTagIds, setExpertiseTagIds] = useState<string[]>([]);

  // Ministry Focal Point-only fields
  const [ministryId, setMinistryId] = useState('');
  const [title, setTitle] = useState('');

  const toggleId = (list: string[], setList: (next: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  // --- Verification: a one-time code to the email or phone (step 2); CAPTCHA before any code is sent ---
  const { data: security } = useSecurityConfig();
  const sendOtp = useSendOtp();
  const channels = security?.otp.channels ?? [];
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('EMAIL');
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = security ? security.captcha.provider !== 'none' : true;
  const codeLength = security?.otp.codeLength ?? 6;

  // Default to a channel the server actually offers.
  useEffect(() => {
    if (channels.length && !channels.includes(otpChannel)) setOtpChannel(channels[0]);
  }, [channels, otpChannel]);

  // Switching steps swaps a tall form for a short card (or back); without this the browser keeps
  // the old scroll offset and the code input ends up above the viewport.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Resend countdown.
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const requestCode = async () => {
    try {
      const result = await sendOtp.mutateAsync({
        channel: otpChannel,
        email: otpChannel === 'EMAIL' ? form.email : undefined,
        phone: otpChannel === 'SMS' ? form.phone : undefined,
        locale,
        captchaToken: captchaToken ?? undefined,
      });
      setSent(result);
      setCode('');
      register.reset();
      setNow(Date.now());
      setResendAt(Date.now() + result.resendInSeconds * 1000);
      setStep('verify');
    } catch (error) {
      const retry =
        error instanceof ApiError ? Number((error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 0) : 0;
      if (retry > 0) {
        setNow(Date.now());
        setResendAt(Date.now() + retry * 1000);
      }
    } finally {
      // CAPTCHA tokens are single-use.
      captchaRef.current?.reset();
    }
  };

  const onSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!security || (captchaRequired && !captchaToken)) return;
    await requestCode();
  };

  const backToDetails = () => {
    sendOtp.reset();
    register.reset();
    setStep('details');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Base registration always creates an Innovation Submitter account (every
      // registrant gets an Innovator Recognition Number); the desired self-service
      // role, if any, is layered on server-side in the same call — the account is
      // created inactive and can't authenticate to a separate role-registration
      // call yet, since it still needs an admin's approval.
      await register.mutateAsync({
        otpChannel,
        otpCode: code,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: role === 'INNOVATION_SUBMITTER' ? undefined : role,
        organizationName: role === 'INVESTOR' ? organizationName : undefined,
        binNumber: role === 'INVESTOR' ? binNumber || undefined : undefined,
        sectorInterestIds: role === 'INVESTOR' && sectorInterestIds.length ? sectorInterestIds : undefined,
        bio: role === 'MENTOR' ? bio || undefined : undefined,
        availability: role === 'MENTOR' ? availability || undefined : undefined,
        expertiseTagIds: role === 'MENTOR' && expertiseTagIds.length ? expertiseTagIds : undefined,
        ministryId: role === 'MINISTRY_FOCAL_POINT' ? ministryId : undefined,
        title: role === 'MINISTRY_FOCAL_POINT' ? title || undefined : undefined,
      });
    } catch {
      /* surfaced below via register.isError */
    }
  };

  if (register.isSuccess) {
    return (
      <AuthCard title={t('registerTitle')} subtitle={t('registerSubtitle')}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-600" />
          <p className="text-sm text-ink-700">{register.data?.message ?? t('registerPendingBody')}</p>
          {next?.startsWith('/challenges/') && (
            <p className="text-sm text-ink-500">Once your account is approved, sign in with the link below and you'll be taken back to the challenge submission form.</p>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-ink-500">
          <Link href={withNext('/sign-in', next)} className="font-semibold text-brand-700 hover:underline">
            {t('signInInstead')}
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (step === 'verify' && sent) {
    return (
      <AuthCard
        title={t('verifyTitle')}
        subtitle={t('codeSentTo', { target: sent.sentTo, minutes: Math.round(sent.expiresInSeconds / 60) })}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-ink-700">
              {t('codeLabel')}
            </label>
            <input
              id="otp-code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={codeLength}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, codeLength))}
              className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em]"
            />
          </div>

          {register.isError && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {register.error instanceof ApiError ? register.error.message : 'Registration failed'}
            </p>
          )}

          <button
            type="submit"
            disabled={register.isPending || code.length !== codeLength}
            className="focus-ring w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {register.isPending ? '…' : t('verifyAndCreate')}
          </button>
        </form>

        <div className="mt-6 space-y-3 border-t border-ink-100 pt-5">
          <p className="text-center text-sm text-ink-500">{t('noCode')}</p>
          {/* A fresh CAPTCHA is needed for each send, so the widget appears once a resend is allowed. */}
          {resendIn === 0 && security && (
            <CaptchaWidget
              ref={captchaRef}
              provider={security.captcha.provider}
              siteKey={security.captcha.siteKey}
              onToken={setCaptchaToken}
            />
          )}
          {sendOtp.isError && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {sendOtp.error instanceof ApiError ? sendOtp.error.message : t('sendCodeFailed')}
            </p>
          )}
          <button
            type="button"
            onClick={requestCode}
            disabled={resendIn > 0 || sendOtp.isPending || (captchaRequired && !captchaToken)}
            className="focus-ring w-full rounded-full border border-ink-100 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
          >
            {sendOtp.isPending ? '…' : resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resendCode')}
          </button>
          <button
            type="button"
            onClick={backToDetails}
            className="focus-ring mx-auto flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('changeDetails')}
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('registerTitle')} subtitle={t('registerSubtitle')}>
      <form onSubmit={onSubmitDetails} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('fullName')}</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('email')}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">
            {otpChannel === 'SMS' ? t('phoneRequired') : t('phone')}
          </label>
          <input
            type="tel"
            required={otpChannel === 'SMS'}
            placeholder="01XXXXXXXXX"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('password')}</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('roleLabel')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as DesiredRole)}
            className="focus-ring w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm"
          >
            <option value="INNOVATION_SUBMITTER">{t('roleSubmitter')}</option>
            <option value="INVESTOR">{t('roleInvestor')}</option>
            <option value="MENTOR">{t('roleMentor')}</option>
            <option value="MINISTRY_FOCAL_POINT">{t('roleMinistry')}</option>
          </select>
        </div>

        {role === 'INVESTOR' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('organizationName')}</label>
              <input
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('binNumberLabel')}</label>
              <input
                value={binNumber}
                onChange={(e) => setBinNumber(e.target.value)}
                placeholder={t('binNumberPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('sectorInterestLabel')}</label>
              <ChipSelect
                options={(categories ?? []).map((c) => ({ id: c.id, label: locale === 'bn' ? c.nameBn : c.nameEn }))}
                selected={sectorInterestIds}
                onToggle={(id) => toggleId(sectorInterestIds, setSectorInterestIds, id)}
              />
            </div>
          </div>
        )}

        {role === 'MENTOR' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('bioLabel')}</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('bioPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('availabilityLabel')}</label>
              <input
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder={t('availabilityPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('expertiseLabel')}</label>
              <ChipSelect
                options={(tags ?? []).map((tg) => ({ id: tg.id, label: locale === 'bn' ? tg.nameBn : tg.nameEn }))}
                selected={expertiseTagIds}
                onToggle={(id) => toggleId(expertiseTagIds, setExpertiseTagIds, id)}
              />
            </div>
          </div>
        )}

        {role === 'MINISTRY_FOCAL_POINT' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('ministryLabel')}</label>
              <select
                required
                value={ministryId}
                onChange={(e) => setMinistryId(e.target.value)}
                className="focus-ring w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">{t('ministryPlaceholder')}</option>
                {ministries?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {locale === 'bn' ? m.nameBn : m.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('designationLabel')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('designationPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        )}

        {channels.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink-700">{t('verifyBy')}</legend>
            <div className={`grid gap-2 ${channels.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {channels.map((ch) => {
                const active = otpChannel === ch;
                const Icon = ch === 'EMAIL' ? Mail : Smartphone;
                return (
                  <label
                    key={ch}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-300 ${
                      active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-700 hover:border-ink-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="otpChannel"
                      value={ch}
                      checked={active}
                      onChange={() => setOtpChannel(ch)}
                      className="sr-only"
                    />
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block font-semibold">{ch === 'EMAIL' ? t('verifyByEmail') : t('verifyBySms')}</span>
                      <span className="block text-xs text-ink-500">
                        {ch === 'EMAIL' ? t('verifyByEmailHint') : t('verifyBySmsHint')}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {security && (
          <CaptchaWidget
            ref={captchaRef}
            provider={security.captcha.provider}
            siteKey={security.captcha.siteKey}
            onToken={setCaptchaToken}
          />
        )}

        {sendOtp.isError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {sendOtp.error instanceof ApiError ? sendOtp.error.message : t('sendCodeFailed')}
          </p>
        )}

        <button
          type="submit"
          disabled={!security || sendOtp.isPending || (captchaRequired && !captchaToken)}
          className="focus-ring w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {sendOtp.isPending ? '…' : t('sendCode')}
        </button>
        {security && captchaRequired && !captchaToken && !sendOtp.isPending && (
          <p className="text-center text-xs text-ink-500">{t('captchaHint')}</p>
        )}
      </form>

      <SsoButtons />

      <p className="mt-6 text-center text-sm text-ink-500">
        {t('haveAccount')}{' '}
        <Link href={withNext('/sign-in', next)} className="font-semibold text-brand-700 hover:underline">
          {t('signInInstead')}
        </Link>
      </p>
    </AuthCard>
  );
}

// useSearchParams (the post-login `next` return path) needs a Suspense boundary in the App Router.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
