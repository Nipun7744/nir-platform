'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, CheckCircle2, Mail, Smartphone } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
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
import {
  useForgotPassword,
  useResetPassword,
  useSecurityConfig,
  useVerifyResetCode,
  type OtpChannel,
  type OtpSent,
} from '@/hooks/use-auth';

type Step = 'request' | 'verify' | 'reset' | 'done';
type RequestErrors = Partial<Record<'email' | 'phone' | 'captcha', string>>;
type PasswordErrors = Partial<Record<'password' | 'confirmPassword', string>>;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const linkCls =
  'focus-ring inline-block rounded py-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800';
const secondaryButtonCls =
  'focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-ink-400 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-ink-600';

/**
 * Forgot password — POST /auth/password/forgot → /verify-code → /reset (see docs/API.md).
 * 1. request: pick email or SMS, enter the registered address/number, pass the CAPTCHA;
 * 2. verify: enter the 6-digit code (resend after the cooldown, with a fresh CAPTCHA);
 * 3. reset: new password + confirmation (the API gives 10 minutes for this step);
 * 4. done: the account is signed out everywhere — go to sign in.
 * Same accessibility conventions as sign-in / registration (WCAG 2.2 AA; report in git commit 814b8e5):
 * own validation in the page language, errors next to fields, focus to the first problem, the
 * heading takes focus when a step replaces the card.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const errorText = useAuthErrorText();
  const { data: security, isError: securityError } = useSecurityConfig();
  const forgot = useForgotPassword();
  const verify = useVerifyResetCode();
  const reset = useResetPassword();

  const channels = security?.otp.channels ?? [];
  const codeLength = security?.otp.codeLength ?? 6;
  const captchaRequired = security ? security.captcha.provider !== 'none' : true;

  const [step, setStep] = useState<Step>('request');
  const [movedStep, setMovedStep] = useState(false);
  const [chosenChannel, setChosenChannel] = useState<OtpChannel>('EMAIL');
  const channel = channels.length && !channels.includes(chosenChannel) ? channels[0] : chosenChannel;
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Step 1 state
  const [clientErrors, setRequestErrors] = useState<RequestErrors>({});
  // Field errors from the API ("no account with this email") — kept apart from client-side ones so
  // re-validation (e.g. the CAPTCHA re-solving after its reset) can't wipe them; cleared on edit.
  const [serverErrors, setServerErrors] = useState<RequestErrors>({});
  const requestErrors: RequestErrors = {
    email: clientErrors.email ?? serverErrors.email,
    phone: clientErrors.phone ?? serverErrors.phone,
    captcha: clientErrors.captcha ?? serverErrors.captcha,
  };
  const [attempted, setAttempted] = useState(false);
  const [requestError, setRequestError] = useState<AuthErrorText | null>(null);

  // Step 2 state
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<AuthErrorText | null>(null);
  const [resendError, setResendError] = useState<AuthErrorText | null>(null);
  const [resendCaptchaError, setResendCaptchaError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Step 3 state
  const [resetToken, setResetToken] = useState<{ token: string; minutes: number } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordAttempted, setPasswordAttempted] = useState(false);
  const [resetError, setResetError] = useState<AuthErrorText | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const goTo = (next: Step) => {
    setMovedStep(true);
    setStep(next);
  };

  useEffect(() => {
    if (!movedStep) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [step, movedStep]);

  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendIn]);
  const startCooldown = (seconds: number) => {
    const start = Date.now();
    setNow(start);
    setResendAt(start + seconds * 1000);
  };

  // ------------------------------------------------------------------------ step 1: request

  const validateRequest = (v = { email, phone, captchaToken }, ch = channel): RequestErrors => {
    const e: RequestErrors = {};
    if (ch === 'EMAIL') {
      if (!v.email.trim()) e.email = t('errEmailRequired');
      else if (!isValidEmail(v.email)) e.email = t('errEmailInvalid');
    } else if (!v.phone.trim()) e.phone = t('errPhoneRequiredReset');
    else if (!isValidBdMobile(v.phone)) e.phone = t('errPhoneInvalid');
    if (captchaRequired && !v.captchaToken) e.captcha = t('captchaHint');
    return e;
  };
  const recheck = (patch: Partial<{ email: string; phone: string; captchaToken: string | null }>, ch = channel) => {
    if (attempted) setRequestErrors(validateRequest({ email, phone, captchaToken, ...patch }, ch));
  };

  const requestCode = async (isResend: boolean) => {
    setRequestError(null);
    setServerErrors({});
    setResendError(null);
    setNotice('');
    try {
      const result = await forgot.mutateAsync({
        channel,
        email: channel === 'EMAIL' ? email.trim() : undefined,
        phone: channel === 'SMS' ? phone : undefined,
        locale,
        captchaToken: captchaToken ?? undefined,
      });
      setSent(result);
      setCode('');
      setCodeError(null);
      setVerifyError(null);
      startCooldown(result.resendInSeconds);
      if (isResend) setNotice(t('codeResent', { target: result.sentTo }));
      else goTo('verify');
    } catch (error) {
      const retry = (error as { details?: { retryAfterSeconds?: number } })?.details?.retryAfterSeconds ?? 0;
      if (retry > 0) startCooldown(Number(retry));
      const mapped = errorText(error, 'sendCodeFailed');
      if (isResend) setResendError(mapped);
      else if (mapped.field === 'email' || mapped.field === 'phone' || mapped.field === 'captcha') {
        setServerErrors({ [mapped.field]: mapped.text });
        if (mapped.field === 'captcha') captchaRef.current?.focus();
        else focusFirstError([mapped.field === 'email' ? 'forgot-email' : 'forgot-phone']);
      } else setRequestError(mapped);
    } finally {
      captchaRef.current?.reset(); // tokens are single-use
      setCaptchaToken(null);
    }
  };

  const onSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!security || forgot.isPending) return;
    setAttempted(true);
    const found = validateRequest();
    setRequestErrors(found);
    if (found.email || found.phone) return focusFirstError([found.email ? 'forgot-email' : 'forgot-phone']);
    if (found.captcha) return captchaRef.current?.focus();
    await requestCode(false);
  };

  // ------------------------------------------------------------------------- step 2: verify

  const onResend = async () => {
    if (resendIn > 0 || forgot.isPending) return;
    if (captchaRequired && !captchaToken) {
      setResendCaptchaError(t('captchaHint'));
      captchaRef.current?.focus();
      return;
    }
    setResendCaptchaError(null);
    await requestCode(true);
  };

  const onSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verify.isPending) return;
    setVerifyError(null);
    if (code.length !== codeLength) {
      setCodeError(t('errCodeLength', { length: codeLength }));
      document.getElementById('reset-code')?.focus();
      return;
    }
    setCodeError(null);
    try {
      const result = await verify.mutateAsync({
        channel,
        email: channel === 'EMAIL' ? email.trim() : undefined,
        phone: channel === 'SMS' ? phone : undefined,
        code,
      });
      setResetToken({ token: result.resetToken, minutes: Math.round(result.expiresInSeconds / 60) });
      setNotice('');
      goTo('reset');
    } catch (error) {
      const mapped = errorText(error, 'resetFailed');
      if (mapped.field === 'code') {
        setCodeError(mapped.text);
        const input = document.getElementById('reset-code') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      } else setVerifyError(mapped);
    }
  };

  const backToRequest = () => {
    forgot.reset();
    verify.reset();
    setSent(null);
    setNotice('');
    setRequestError(null);
    goTo('request');
  };

  const startOver = () => {
    reset.reset();
    setResetToken(null);
    setPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setPasswordAttempted(false);
    setResetError(null);
    setSessionExpired(false);
    backToRequest();
  };

  // -------------------------------------------------------------------------- step 3: reset

  const validatePassword = (v = { password, confirmPassword }): PasswordErrors => {
    const e: PasswordErrors = {};
    if (!v.password) e.password = t('errNewPasswordRequired');
    else if (v.password.length < PASSWORD_MIN) e.password = t('errPasswordShort');
    else if (v.password.length > PASSWORD_MAX) e.password = t('errPasswordLong');
    if (!v.confirmPassword) e.confirmPassword = t('errConfirmRequired');
    else if (v.password && v.confirmPassword !== v.password) e.confirmPassword = t('errPasswordMismatch');
    return e;
  };
  const recheckPassword = (patch: Partial<{ password: string; confirmPassword: string }>) => {
    if (passwordAttempted) setPasswordErrors(validatePassword({ password, confirmPassword, ...patch }));
  };

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reset.isPending || !resetToken) return;
    setPasswordAttempted(true);
    setResetError(null);
    const found = validatePassword();
    setPasswordErrors(found);
    if (Object.keys(found).length) {
      focusFirstError([found.password && 'reset-password', found.confirmPassword && 'reset-confirm'].filter(Boolean) as string[]);
      return;
    }
    try {
      await reset.mutateAsync({ resetToken: resetToken.token, password, confirmPassword });
      setPassword('');
      setConfirmPassword('');
      goTo('done');
    } catch (error) {
      const mapped = errorText(error, 'resetFailed');
      if (mapped.field === 'password' || mapped.field === 'confirmPassword') {
        setPasswordErrors({ [mapped.field]: mapped.text });
        focusFirstError([mapped.field === 'password' ? 'reset-password' : 'reset-confirm']);
      } else {
        setSessionExpired(mapped.field === 'session');
        setResetError(mapped);
      }
    }
  };

  // ------------------------------------------------------------------------------- render

  const backToSignIn = (
    <p className="mt-6 text-center text-sm text-ink-600">
      <Link href="/sign-in" className={linkCls}>
        {t('backToSignIn')}
      </Link>
    </p>
  );

  if (step === 'done') {
    return (
      <AuthCard title={t('resetDoneTitle')} subtitle={t('forgotPageTitle')} focusHeading>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-ink-700">{t('resetDoneBody')}</p>
        </div>
        <Link href="/sign-in" className={`${primaryButtonCls} mt-4`}>
          {t('goToSignIn')}
        </Link>
      </AuthCard>
    );
  }

  if (step === 'reset' && resetToken) {
    return (
      <AuthCard
        title={t('newPasswordTitle')}
        subtitle={t('newPasswordSubtitle', { minutes: resetToken.minutes })}
        focusHeading={movedStep}
      >
        <form onSubmit={onSubmitPassword} noValidate className="space-y-4">
          <RequiredNote />
          {/* Lets password managers save the new password against the right account. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={channel === 'EMAIL' ? email.trim() : phone}
            readOnly
            hidden
          />
          <FormField
            id="reset-password"
            label={t('newPassword')}
            required
            hint={t('passwordHint')}
            error={passwordErrors.password}
          >
            {(a11y) => (
              <PasswordInput
                {...a11y}
                name="new-password"
                required
                minLength={PASSWORD_MIN}
                maxLength={PASSWORD_MAX}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  recheckPassword({ password: e.target.value });
                }}
                className={authInputCls(Boolean(passwordErrors.password))}
              />
            )}
          </FormField>
          <FormField id="reset-confirm" label={t('confirmPassword')} required error={passwordErrors.confirmPassword}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                name="confirm-password"
                required
                maxLength={PASSWORD_MAX}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  recheckPassword({ confirmPassword: e.target.value });
                }}
                className={authInputCls(Boolean(passwordErrors.confirmPassword))}
              />
            )}
          </FormField>

          <FormAlert lang={resetError?.lang}>{resetError?.text}</FormAlert>
          {sessionExpired ? (
            <button type="button" onClick={startOver} className={primaryButtonCls}>
              {t('startOver')}
            </button>
          ) : (
            <button type="submit" aria-disabled={reset.isPending || undefined} className={primaryButtonCls}>
              {reset.isPending ? t('savingPassword') : t('saveNewPassword')}
            </button>
          )}
          <StatusMessage>{reset.isPending ? t('savingPassword') : ''}</StatusMessage>
        </form>
        {backToSignIn}
      </AuthCard>
    );
  }

  if (step === 'verify' && sent) {
    const codeHintId = 'reset-code-hint';
    const codeErrorId = 'reset-code-error';
    return (
      <AuthCard
        title={t('resetVerifyTitle')}
        subtitle={t('codeSentTo', { target: sent.sentTo, minutes: Math.round(sent.expiresInSeconds / 60) })}
        focusHeading={movedStep}
      >
        <form onSubmit={onSubmitCode} noValidate className="space-y-4">
          <div>
            <label htmlFor="reset-code" className="mb-1 block text-sm font-medium text-ink-700">
              {t('codeLabel')}
              <span aria-hidden="true" className="text-red-700"> *</span>
            </label>
            <input
              id="reset-code"
              name="otp"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={codeLength}
              value={code}
              aria-invalid={codeError ? true : undefined}
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
              <p id={codeErrorId} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
                {codeError}
              </p>
            )}
          </div>

          <FormAlert lang={verifyError?.lang}>{verifyError?.text}</FormAlert>

          <button type="submit" aria-disabled={verify.isPending || undefined} className={primaryButtonCls}>
            {verify.isPending ? t('verifying') : t('verifyCode')}
          </button>
          <StatusMessage>{verify.isPending ? t('verifying') : notice}</StatusMessage>
        </form>

        <div className="mt-6 space-y-3 border-t border-ink-100 pt-5">
          <p className="text-center text-sm text-ink-600">{t('noCode')}</p>
          {/* A fresh CAPTCHA is needed for each send, so the widget appears once a resend is allowed. */}
          {resendIn === 0 && security && (
            <CaptchaWidget
              ref={captchaRef}
              id="reset-resend-captcha"
              provider={security.captcha.provider}
              siteKey={security.captcha.siteKey}
              error={resendCaptchaError}
              onToken={(token) => {
                setCaptchaToken(token);
                if (token) setResendCaptchaError(null);
              }}
            />
          )}
          {notice && <p className="text-center text-sm font-medium text-brand-700">{notice}</p>}
          <FormAlert lang={resendError?.lang}>{resendError?.text}</FormAlert>
          <button
            type="button"
            onClick={onResend}
            disabled={resendIn > 0}
            aria-disabled={forgot.isPending || undefined}
            className={secondaryButtonCls}
          >
            {forgot.isPending ? t('sendingCode') : resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resendCode')}
          </button>
          <button
            type="button"
            onClick={backToRequest}
            className="focus-ring mx-auto flex min-h-[44px] items-center gap-1 rounded-full px-4 text-sm font-medium text-ink-700 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('changeContact')}
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('forgotTitle')} subtitle={t('forgotSubtitle')} focusHeading={movedStep}>
      <form onSubmit={onSubmitRequest} noValidate className="space-y-4">
        <RequiredNote />
        {channels.length > 1 && (
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink-700">{t('resetVia')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {channels.map((ch) => {
                const active = channel === ch;
                const Icon = ch === 'EMAIL' ? Mail : Smartphone;
                return (
                  <label
                    key={ch}
                    className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border-2 px-3 py-2.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nirgreen-deep has-[:focus-visible]:ring-offset-2 ${
                      active ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-400 text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resetChannel"
                      value={ch}
                      checked={active}
                      onChange={() => {
                        setChosenChannel(ch);
                        setRequestError(null);
                        setServerErrors({});
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
                        {ch === 'EMAIL' ? t('resetViaEmailHint') : t('resetViaSmsHint')}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {channel === 'EMAIL' ? (
          <FormField id="forgot-email" label={t('email')} required error={requestErrors.email}>
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
                  setServerErrors((prev) => ({ ...prev, email: undefined }));
                  recheck({ email: e.target.value });
                }}
                className={authInputCls(Boolean(requestErrors.email))}
              />
            )}
          </FormField>
        ) : (
          <FormField id="forgot-phone" label={t('mobileNumber')} required hint={t('phoneHint')} error={requestErrors.phone}>
            {(a11y) => (
              <input
                {...a11y}
                type="tel"
                name="phone"
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setServerErrors((prev) => ({ ...prev, phone: undefined }));
                  recheck({ phone: e.target.value });
                }}
                className={authInputCls(Boolean(requestErrors.phone))}
              />
            )}
          </FormField>
        )}

        {security && (
          <CaptchaWidget
            ref={captchaRef}
            id="forgot-captcha"
            provider={security.captcha.provider}
            siteKey={security.captcha.siteKey}
            error={requestErrors.captcha}
            onToken={(token) => {
              setCaptchaToken(token);
              if (token) setServerErrors((prev) => ({ ...prev, captcha: undefined }));
              recheck({ captchaToken: token });
            }}
          />
        )}
        {securityError && <FormAlert>{t('captchaLoadError')}</FormAlert>}

        <FormAlert lang={requestError?.lang}>{requestError?.text}</FormAlert>

        <button type="submit" aria-disabled={!security || forgot.isPending || undefined} className={primaryButtonCls}>
          {forgot.isPending ? t('sendingCode') : t('sendResetCode')}
        </button>
        <StatusMessage>{forgot.isPending ? t('sendingCode') : ''}</StatusMessage>
      </form>
      {backToSignIn}
    </AuthCard>
  );
}
