'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeNextPath, withNext } from '@/lib/safe-next';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { ArrowLeft, CheckCircle2, Mail, Smartphone } from 'lucide-react';
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
  isValidBdMobile,
  isValidEmail,
  primaryButtonCls,
  useAuthErrorText,
  type AuthErrorText,
} from '@/components/auth/auth-form';
import { useRegister, useSecurityConfig, useSendOtp, type OtpChannel, type OtpSent } from '@/hooks/use-auth';
import { useCategories, useMinistries, useTags } from '@/hooks/use-content';

type DesiredRole = 'INNOVATION_SUBMITTER' | 'INVESTOR' | 'MENTOR' | 'MINISTRY_FOCAL_POINT';
type DetailErrors = Partial<Record<'fullName' | 'email' | 'phone' | 'password' | 'captcha', string>>;

/**
 * 2026-11-16: every new account is an Innovation Submitter only — the role dropdown is shown
 * locked to it and the API rejects any other role. Set to true (here and SELF_SERVICE_ROLES_AT_SIGNUP
 * in apps/api/src/auth/auth.service.ts) to let registrants pick Investor / Mentor / Ministry again.
 */
const SELF_SERVICE_ROLES_AT_SIGNUP = false;

/** Seconds the "account ready" screen waits before continuing on its own (2.2.1: can be stopped). */
const REDIRECT_SECONDS = 5;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Multi-select chips: a labelled group of toggle buttons (aria-pressed) — 4.1.2, 1.4.1. */
function ChipSelect({
  labelId,
  options,
  selected,
  onToggle,
}: {
  labelId: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.id)}
            className={`focus-ring inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition ${
              active ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-400 text-ink-700 hover:bg-ink-50'
            }`}
          >
            {active && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Continues automatically after REDIRECT_SECONDS so the confirmation can be read, with a visible
 * countdown, a "Continue" button and a "Stay on this page" button that cancels the timer
 * (WCAG 2.2.1 Timing Adjustable — the user can turn the time limit off).
 */
function RedirectAfterRegister({ to, label }: { to: string; label: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [left, setLeft] = useState(REDIRECT_SECONDS);
  const [stopped, setStopped] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (stopped) return;
    if (left <= 0) {
      router.push(to);
      return;
    }
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left, stopped, router, to]);
  return (
    <div className="mt-4 space-y-3">
      {!stopped && (
        // Not a live region: re-announcing every second would drown out everything else.
        <p className="text-center text-sm text-ink-600">{t('redirectIn', { seconds: left })}</p>
      )}
      <button ref={continueRef} type="button" onClick={() => router.push(to)} className={primaryButtonCls}>
        {label}
      </button>
      {!stopped && (
        <button
          type="button"
          // This button removes itself — hand focus to "Continue" so it isn't lost (2.4.3).
          onClick={() => {
            setStopped(true);
            continueRef.current?.focus();
          }}
          className="focus-ring mx-auto flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-ink-700 underline underline-offset-2 hover:text-ink-900"
        >
          {t('stayHere')}
        </button>
      )}
    </div>
  );
}

function RegisterPageInner() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const register = useRegister();
  const errorText = useAuthErrorText();
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
  const { data: security, isError: securityError } = useSecurityConfig();
  const sendOtp = useSendOtp();
  const channels = security?.otp.channels ?? [];
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [chosenChannel, setOtpChannel] = useState<OtpChannel>('EMAIL');
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = security ? security.captcha.provider !== 'none' : true;
  const codeLength = security?.otp.codeLength ?? 6;

  // Accessible error / status state (2026-11-17).
  const [errors, setErrors] = useState<DetailErrors>({});
  // Field errors reported by the API (e.g. "email already registered"). Kept apart from the
  // client-side ones so re-validation can't wipe them; cleared when that field is edited.
  const [serverFieldErrors, setServerFieldErrors] = useState<DetailErrors>({});
  const fieldError = (k: keyof DetailErrors) => errors[k] ?? serverFieldErrors[k];
  const [attempted, setAttempted] = useState(false);
  const [detailsError, setDetailsError] = useState<AuthErrorText | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<AuthErrorText | null>(null);
  const [resendError, setResendError] = useState<AuthErrorText | null>(null);
  const [resendCaptchaError, setResendCaptchaError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [returnedToDetails, setReturnedToDetails] = useState(false);

  // The chosen channel, unless the server doesn't offer it (then its first channel).
  const otpChannel = channels.length && !channels.includes(chosenChannel) ? channels[0] : chosenChannel;

  const startCooldown = (seconds: number) => {
    const start = Date.now();
    setNow(start);
    setResendAt(start + seconds * 1000);
  };

  // Switching steps swaps a tall form for a short card (or back); without this the browser keeps
  // the old scroll offset and the code input ends up above the viewport. No smooth scrolling for
  // people who asked the OS to reduce motion.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [step]);

  // Resend countdown.
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const validateDetails = (v = { ...form, captchaToken }, channel = otpChannel): DetailErrors => {
    const e: DetailErrors = {};
    if (!v.fullName.trim()) e.fullName = t('errNameRequired');
    if (!v.email.trim()) e.email = t('errEmailRequired');
    else if (!isValidEmail(v.email)) e.email = t('errEmailInvalid');
    if (!v.phone.trim()) {
      if (channel === 'SMS') e.phone = t('errPhoneRequired');
    } else if (!isValidBdMobile(v.phone)) e.phone = t('errPhoneInvalid');
    if (!v.password) e.password = t('errPasswordRequired');
    else if (v.password.length < 8) e.password = t('errPasswordShort');
    if (captchaRequired && !v.captchaToken) e.captcha = t('captchaHint');
    return e;
  };

  const recheck = (patch: Partial<typeof form & { captchaToken: string | null }>, channel = otpChannel) => {
    if (attempted) setErrors(validateDetails({ ...form, captchaToken, ...patch }, channel));
  };
  const setField = (key: keyof typeof form, value: string) => {
    setForm({ ...form, [key]: value });
    setServerFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    recheck({ [key]: value });
  };

  const DETAIL_FIELD_IDS: Record<string, string> = {
    fullName: 'register-name',
    email: 'register-email',
    phone: 'register-phone',
    password: 'register-password',
  };
  const focusDetailsError = (e: DetailErrors) => {
    const order = (['fullName', 'email', 'phone', 'password'] as const).filter((k) => e[k]).map((k) => DETAIL_FIELD_IDS[k]);
    if (order.length) focusFirstError(order);
    else if (e.captcha) captchaRef.current?.focus();
  };

  const requestCode = async (isResend: boolean) => {
    setDetailsError(null);
    setServerFieldErrors({});
    setResendError(null);
    setNotice('');
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
      setCodeError(null);
      setVerifyError(null);
      register.reset();
      startCooldown(result.resendInSeconds);
      setStep('verify');
      if (isResend) setNotice(t('codeResent', { target: result.sentTo }));
    } catch (error) {
      const retry = (error as { details?: { retryAfterSeconds?: number } })?.details?.retryAfterSeconds ?? 0;
      if (retry > 0) startCooldown(Number(retry));
      const mapped = errorText(error, 'sendCodeFailed');
      if (!isResend && (mapped.field === 'email' || mapped.field === 'phone' || mapped.field === 'captcha')) {
        // The problem is with one field — show it there and send the user to it (3.3.1, 3.3.3).
        const key = mapped.field;
        setServerFieldErrors({ [key]: mapped.text });
        if (key === 'captcha') captchaRef.current?.focus();
        else focusFirstError([DETAIL_FIELD_IDS[key]]);
      } else if (isResend) setResendError(mapped);
      else setDetailsError(mapped);
    } finally {
      // CAPTCHA tokens are single-use.
      captchaRef.current?.reset();
    }
  };

  const onSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!security || sendOtp.isPending) return;
    setAttempted(true);
    const found = validateDetails();
    setErrors(found);
    if (Object.keys(found).length) {
      focusDetailsError(found);
      return;
    }
    await requestCode(false);
  };

  const onResend = async () => {
    if (resendIn > 0 || sendOtp.isPending) return;
    if (captchaRequired && !captchaToken) {
      setResendCaptchaError(t('captchaHint'));
      captchaRef.current?.focus();
      return;
    }
    setResendCaptchaError(null);
    await requestCode(true);
  };

  const backToDetails = () => {
    sendOtp.reset();
    register.reset();
    setNotice('');
    setReturnedToDetails(true);
    setStep('details');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (register.isPending) return;
    setVerifyError(null);
    if (code.length !== codeLength) {
      setCodeError(t('errCodeLength', { length: codeLength }));
      document.getElementById('otp-code')?.focus();
      return;
    }
    setCodeError(null);
    try {
      // Base registration always creates an Innovation Submitter account (every
      // registrant gets an Innovator Recognition Number); the desired self-service
      // role, if any, is layered on server-side in the same call. A verified code
      // activates the account and the response signs the user in (useRegister).
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
    } catch (error) {
      const mapped = errorText(error, 'registerFailed');
      if (mapped.field === 'code') {
        setCodeError(mapped.text);
        const input = document.getElementById('otp-code') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      } else setVerifyError(mapped);
    }
  };

  // Verified OTP → active account, already signed in: go straight on (back to the challenge form
  // when they came from one, else the dashboard).
  if (register.isSuccess && register.data && !register.data.pending) {
    return (
      <AuthCard title={t('registerActiveTitle')} subtitle={t('registerSubtitle')} focusHeading>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-ink-700">{t('registerActiveBody')}</p>
        </div>
        <RedirectAfterRegister to={next ?? '/dashboard'} label={t('registerActiveContinue')} />
      </AuthCard>
    );
  }

  if (register.isSuccess) {
    return (
      <AuthCard title={t('registerTitle')} subtitle={t('registerSubtitle')} focusHeading>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-ink-700">{register.data?.message ?? t('registerPendingBody')}</p>
          {next?.startsWith('/challenges/') && <p className="text-sm text-ink-600">{t('registerChallengeHint')}</p>}
        </div>
        <p className="mt-6 text-center text-sm text-ink-600">
          <Link
            href={withNext('/sign-in', next)}
            className="focus-ring inline-block rounded py-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            {t('signInInstead')}
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (step === 'verify' && sent) {
    const codeHintId = 'otp-code-hint';
    const codeErrorId = 'otp-code-error';
    return (
      <AuthCard
        title={t('verifyTitle')}
        subtitle={t('codeSentTo', { target: sent.sentTo, minutes: Math.round(sent.expiresInSeconds / 60) })}
      >
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-ink-700">
              {t('codeLabel')}
              <span aria-hidden="true" className="text-red-700"> *</span>
            </label>
            <input
              id="otp-code"
              name="otp"
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={codeLength}
              value={code}
              aria-invalid={codeError ? true : undefined}
              // The subtitle says where the code went and when it expires — read it with the field.
              aria-describedby={[codeError && codeErrorId, codeHintId, 'auth-card-subtitle'].filter(Boolean).join(' ')}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, codeLength));
                setCodeError(null);
              }}
              className={`${authInputCls(Boolean(codeError))} py-3 text-center font-mono text-2xl tracking-[0.5em] sm:text-2xl`}
            />
            <p id={codeHintId} className="mt-1 text-xs text-ink-600">
              {t('codeHint', { length: codeLength })}
            </p>
            {codeError && (
              // role="alert": focus is usually already on this field, so a changed description
              // alone would not be re-read — the alert makes sure the new error is announced.
              <p id={codeErrorId} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
                {codeError}
              </p>
            )}
          </div>

          <FormAlert lang={verifyError?.lang}>{verifyError?.text}</FormAlert>

          <button type="submit" aria-disabled={register.isPending || undefined} className={primaryButtonCls}>
            {register.isPending ? t('verifying') : t('verifyAndCreate')}
          </button>
          <StatusMessage>{register.isPending ? t('verifying') : notice}</StatusMessage>
        </form>

        <div className="mt-6 space-y-3 border-t border-ink-100 pt-5">
          <p className="text-center text-sm text-ink-600">{t('noCode')}</p>
          {/* A fresh CAPTCHA is needed for each send, so the widget appears once a resend is allowed. */}
          {resendIn === 0 && security && (
            <CaptchaWidget
              ref={captchaRef}
              id="resend-captcha"
              provider={security.captcha.provider}
              siteKey={security.captcha.siteKey}
              error={resendCaptchaError}
              onToken={(token) => {
                setCaptchaToken(token);
                if (token) setResendCaptchaError(null);
              }}
            />
          )}
          <FormAlert lang={resendError?.lang}>{resendError?.text}</FormAlert>
          <button
            type="button"
            onClick={onResend}
            disabled={resendIn > 0}
            aria-disabled={sendOtp.isPending || undefined}
            className="focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-ink-400 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-ink-600"
          >
            {sendOtp.isPending ? t('sendingCode') : resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resendCode')}
          </button>
          <button
            type="button"
            onClick={backToDetails}
            className="focus-ring mx-auto flex min-h-[44px] items-center gap-1 rounded-full px-4 text-sm font-medium text-ink-700 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('changeDetails')}
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('registerTitle')} subtitle={t('registerSubtitle')} focusHeading={returnedToDetails}>
      <form onSubmit={onSubmitDetails} noValidate className="space-y-4">
        <RequiredNote />
        <FormField id="register-name" label={t('fullName')} required error={fieldError('fullName')}>
          {(a11y) => (
            <input
              {...a11y}
              name="name"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              className={authInputCls(Boolean(fieldError('fullName')))}
            />
          )}
        </FormField>
        <FormField id="register-email" label={t('email')} required error={fieldError('email')}>
          {(a11y) => (
            <input
              {...a11y}
              type="email"
              name="email"
              required
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              className={authInputCls(Boolean(fieldError('email')))}
            />
          )}
        </FormField>
        <FormField
          id="register-phone"
          label={otpChannel === 'SMS' ? t('phoneRequired') : t('phone')}
          required={otpChannel === 'SMS'}
          hint={t('phoneHint')}
          error={fieldError('phone')}
        >
          {(a11y) => (
            <input
              {...a11y}
              type="tel"
              name="phone"
              required={otpChannel === 'SMS'}
              autoComplete="tel"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              className={authInputCls(Boolean(fieldError('phone')))}
            />
          )}
        </FormField>
        <FormField id="register-password" label={t('password')} required hint={t('passwordHint')} error={fieldError('password')}>
          {(a11y) => (
            <PasswordInput
              {...a11y}
              name="new-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              className={authInputCls(Boolean(fieldError('password')))}
            />
          )}
        </FormField>

        <div>
          <label htmlFor="register-role" className="mb-1 block text-sm font-medium text-ink-700">
            {t('roleLabel')}
          </label>
          {SELF_SERVICE_ROLES_AT_SIGNUP ? (
            <select
              id="register-role"
              value={role}
              onChange={(e) => setRole(e.target.value as DesiredRole)}
              className={authInputCls()}
            >
              <option value="INNOVATION_SUBMITTER">{t('roleSubmitter')}</option>
              <option value="INVESTOR">{t('roleInvestor')}</option>
              <option value="MENTOR">{t('roleMentor')}</option>
              <option value="MINISTRY_FOCAL_POINT">{t('roleMinistry')}</option>
            </select>
          ) : (
            <>
              {/* Locked to one value: disabled (so it can't be changed) but described by why. */}
              <select
                id="register-role"
                value="INNOVATION_SUBMITTER"
                disabled
                aria-describedby="register-role-hint"
                className="block min-h-[44px] w-full cursor-not-allowed rounded-lg border border-ink-400 bg-ink-50 px-3 py-2.5 text-base text-ink-700 sm:text-sm"
              >
                <option value="INNOVATION_SUBMITTER">{t('roleSubmitter')}</option>
              </select>
              <p id="register-role-hint" className="mt-1 text-xs text-ink-600">
                {t('roleFixedHint')}
              </p>
            </>
          )}
        </div>

        {role === 'INVESTOR' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <FormField id="register-org" label={t('organizationName')} required>
              {(a11y) => (
                <input {...a11y} required autoComplete="organization" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className={authInputCls()} />
              )}
            </FormField>
            <FormField id="register-bin" label={t('binNumberLabel')}>
              {(a11y) => (
                <input {...a11y} value={binNumber} onChange={(e) => setBinNumber(e.target.value)} placeholder={t('binNumberPlaceholder')} className={authInputCls()} />
              )}
            </FormField>
            <div>
              <p id="register-sectors-label" className="mb-1 block text-sm font-medium text-ink-700">
                {t('sectorInterestLabel')}
              </p>
              <ChipSelect
                labelId="register-sectors-label"
                options={(categories ?? []).map((c) => ({ id: c.id, label: locale === 'bn' ? c.nameBn : c.nameEn }))}
                selected={sectorInterestIds}
                onToggle={(id) => toggleId(sectorInterestIds, setSectorInterestIds, id)}
              />
            </div>
          </div>
        )}

        {role === 'MENTOR' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <FormField id="register-bio" label={t('bioLabel')}>
              {(a11y) => (
                <textarea {...a11y} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('bioPlaceholder')} className={authInputCls()} />
              )}
            </FormField>
            <FormField id="register-availability" label={t('availabilityLabel')}>
              {(a11y) => (
                <input {...a11y} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder={t('availabilityPlaceholder')} className={authInputCls()} />
              )}
            </FormField>
            <div>
              <p id="register-expertise-label" className="mb-1 block text-sm font-medium text-ink-700">
                {t('expertiseLabel')}
              </p>
              <ChipSelect
                labelId="register-expertise-label"
                options={(tags ?? []).map((tg) => ({ id: tg.id, label: locale === 'bn' ? tg.nameBn : tg.nameEn }))}
                selected={expertiseTagIds}
                onToggle={(id) => toggleId(expertiseTagIds, setExpertiseTagIds, id)}
              />
            </div>
          </div>
        )}

        {role === 'MINISTRY_FOCAL_POINT' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <FormField id="register-ministry" label={t('ministryLabel')} required>
              {(a11y) => (
                <select {...a11y} required value={ministryId} onChange={(e) => setMinistryId(e.target.value)} className={authInputCls()}>
                  <option value="">{t('ministryPlaceholder')}</option>
                  {ministries?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {locale === 'bn' ? m.nameBn : m.nameEn}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="register-designation" label={t('designationLabel')}>
              {(a11y) => (
                <input {...a11y} autoComplete="organization-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('designationPlaceholder')} className={authInputCls()} />
              )}
            </FormField>
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
                  // Selection is shown by a radio dot as well as colour (1.4.1); borders and the
                  // focus ring meet 3:1 (1.4.11).
                  <label
                    key={ch}
                    className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border-2 px-3 py-2.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nirgreen-deep has-[:focus-visible]:ring-offset-2 ${
                      active ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-400 text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="otpChannel"
                      value={ch}
                      checked={active}
                      onChange={() => {
                        setOtpChannel(ch);
                        recheck({}, ch);
                      }}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        active ? 'border-brand-700' : 'border-ink-600'
                      }`}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-brand-700" />}
                    </span>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">{ch === 'EMAIL' ? t('verifyByEmail') : t('verifyBySms')}</span>
                      <span className="block text-xs text-ink-600">
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
            id="register-captcha"
            provider={security.captcha.provider}
            siteKey={security.captcha.siteKey}
            error={fieldError('captcha')}
            onToken={(token) => {
              setCaptchaToken(token);
              if (token) setServerFieldErrors((prev) => ({ ...prev, captcha: undefined }));
              recheck({ captchaToken: token });
            }}
          />
        )}
        {securityError && <FormAlert>{t('captchaLoadError')}</FormAlert>}

        <FormAlert lang={detailsError?.lang}>{detailsError?.text}</FormAlert>

        <button type="submit" aria-disabled={!security || sendOtp.isPending || undefined} className={primaryButtonCls}>
          {sendOtp.isPending ? t('sendingCode') : t('sendCode')}
        </button>
        <StatusMessage>{sendOtp.isPending ? t('sendingCode') : ''}</StatusMessage>
      </form>

      <SsoButtons />

      <p className="mt-6 text-center text-sm text-ink-600">
        {t('haveAccount')}{' '}
        <Link
          href={withNext('/sign-in', next)}
          className="focus-ring inline-block rounded py-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
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
