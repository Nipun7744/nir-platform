'use client';

import clsx from 'clsx';
import { forwardRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { ApiError } from '@/lib/api-client';

/**
 * Accessible building blocks for the sign-in and registration forms (WCAG 2.2 AA, 2026-11-17 —
 * full report in git commit 814b8e5):
 *  - every control has a programmatic <label for>, an optional hint and an inline error, all
 *    wired up through aria-describedby / aria-invalid (1.3.1, 3.3.1, 3.3.2, 4.1.2);
 *  - input borders use ink-400 (5.7:1 on white) instead of ink-100 (1.3:1) (1.4.11);
 *  - controls are at least 44px tall (2.5.8) and carry scroll-margin so the 118px sticky header
 *    never hides a focused field (2.4.11);
 *  - API errors are mapped to translated text; anything unmapped keeps the server's English
 *    wording and is marked lang="en" on the Bangla site (3.1.2).
 */

export const authInputCls = (invalid?: boolean) =>
  clsx(
    'focus-ring block min-h-[44px] w-full scroll-mt-36 scroll-mb-8 rounded-lg border bg-white px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 sm:text-sm',
    invalid ? 'border-red-700 ring-1 ring-red-700' : 'border-ink-400',
  );

export const primaryButtonCls =
  'focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-80';

/** "Fields marked * are required." — shown once at the top of each form. */
export function RequiredNote() {
  const t = useTranslations('auth');
  // Hidden from screen readers: the asterisks it explains are too; they hear "required" from
  // each control's `required` attribute instead.
  return (
    <p aria-hidden="true" className="text-sm text-ink-600">
      {t('requiredNote')}
    </p>
  );
}

/** Red inline error with an icon; the id is what the control's aria-describedby points at. */
export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export interface FieldA11yProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
  'aria-required'?: true;
}

/**
 * Label + control + hint + error. The control is rendered by `children(props)` so any input type
 * (including PasswordInput) gets the same id / aria wiring.
 */
export function FormField({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: (props: FieldA11yProps) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-700">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-700">
            {' '}*
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-ink-600">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

/**
 * A form-level message. role="alert" makes screen readers announce it as soon as it appears
 * (4.1.3); `lang` marks untranslated server text on the Bangla site (3.1.2).
 */
export const FormAlert = forwardRef<HTMLDivElement, { children?: React.ReactNode; lang?: string; className?: string }>(
  function FormAlert({ children, lang, className }, ref) {
    return (
      <div ref={ref} role="alert" className={className}>
        {children && (
          <p className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span lang={lang}>{children}</span>
          </p>
        )}
      </div>
    );
  },
);

/** Visually hidden polite live region for progress messages ("Signing in…"). */
export function StatusMessage({ children }: { children?: React.ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

// ------------------------------------------------------------------------------- validation

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mirrors normalizeBdMobile() in apps/api/src/common/utils/phone.ts. */
const BD_MOBILE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;

export const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isValidBdMobile = (v: string) => BD_MOBILE_RE.test(v.replace(/[\s\-().]/g, ''));

/** Moves focus to the first field (in DOM order) that has an error. */
export function focusFirstError(ids: string[]) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      return;
    }
  }
}

// ---------------------------------------------------------------------------- server errors

export type AuthErrorField = 'email' | 'phone' | 'code' | 'captcha' | 'password' | 'confirmPassword' | 'session';
export interface AuthErrorText {
  text: string;
  /** Set when the text is the API's untranslated English on a non-English page. */
  lang?: string;
  /** Field the error belongs to, when it is about one field. */
  field?: AuthErrorField;
}

/**
 * Turns an API / network error into text in the visitor's language. Known API messages
 * (apps/api/src/auth/*.ts) are matched by wording; anything else falls back to the server's own
 * (English) message, marked as such.
 */
export function useAuthErrorText() {
  const t = useTranslations('auth');
  const locale = useLocale();
  return (error: unknown, fallbackKey: 'signInFailed' | 'registerFailed' | 'sendCodeFailed' | 'resetFailed'): AuthErrorText => {
    if (!(error instanceof ApiError)) return { text: t('networkError') };
    const m = error.message || '';
    const details = (error.details ?? {}) as { retryAfterSeconds?: number };
    if (error.status === 401 && /invalid credentials/i.test(m)) return { text: t('invalidCredentials') };
    if (/pending administrator approval/i.test(m)) return { text: t('accountPending') };
    if (/not approved/i.test(m)) return { text: t('accountRejected') };
    if (/complete the captcha/i.test(m)) return { text: t('captchaHint'), field: 'captcha' };
    if (/captcha/i.test(m)) return { text: t('captchaFailed'), field: 'captcha' };
    if (error.status === 429 && details.retryAfterSeconds) return { text: t('waitToResend', { seconds: details.retryAfterSeconds }) };
    if (error.status === 429) return { text: t('tooManyRequests') };
    if (/account with this email/i.test(m)) return { text: t('emailTaken'), field: 'email' };
    if (/account with this phone/i.test(m)) return { text: t('phoneTaken'), field: 'phone' };
    if (/valid bangladeshi mobile/i.test(m)) return { text: t('errPhoneInvalid'), field: 'phone' };
    if (/phone number is required/i.test(m)) return { text: t('errPhoneRequired'), field: 'phone' };
    const left = m.match(/incorrect verification code\. (\d+) attempt/i);
    if (left) return { text: t('codeIncorrect', { left: Number(left[1]) }), field: 'code' };
    if (/too many incorrect attempts/i.test(m)) return { text: t('codeTooManyAttempts'), field: 'code' };
    if (/expired or was not requested/i.test(m)) return { text: t('codeExpired'), field: 'code' };
    if (/already been used/i.test(m)) return { text: t('codeUsed'), field: 'code' };
    // Forgot password (AuthService.findResetAccount / resetPassword).
    if (/no account is registered with this email/i.test(m)) return { text: t('noAccountEmail'), field: 'email' };
    if (/no account is registered with this mobile/i.test(m)) return { text: t('noAccountPhone'), field: 'phone' };
    if (/account is not active/i.test(m)) return { text: t('accountInactive') };
    if (/reset session has expired/i.test(m)) return { text: t('resetSessionExpired'), field: 'session' };
    if (/passwords do not match/i.test(m)) return { text: t('errPasswordMismatch'), field: 'confirmPassword' };
    if (/different from your current password/i.test(m)) return { text: t('passwordSameAsOld'), field: 'password' };
    if (/at least 8 characters/i.test(m)) return { text: t('errPasswordShort'), field: 'password' };
    if (/at most 128 characters/i.test(m)) return { text: t('errPasswordLong'), field: 'password' };
    if (!m) return { text: t(fallbackKey) };
    return { text: m, lang: locale === 'en' ? undefined : 'en' };
  };
}
