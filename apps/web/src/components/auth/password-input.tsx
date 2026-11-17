'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with a show/hide (eye) toggle. Only switches the input's `type`; the value,
 * validation attributes (required/minLength/…), aria-* wiring and autocomplete are passed
 * through untouched. The toggle is type="button" so it never submits the form.
 *
 * Accessibility (2026-11-17): the toggle keeps one fixed name ("Show password") and exposes its
 * state through aria-pressed — changing both the name and the state made screen readers announce
 * contradictory things ("Hide password, pressed"). It is a 44×44 target (2.5.8) and its icon uses
 * ink-600 (11:1) instead of ink-400.
 */
export function PasswordInput({ className = '', ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const t = useTranslations('auth');
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={t('showPassword')}
        aria-pressed={visible}
        aria-controls={props.id}
        title={visible ? t('hidePassword') : t('showPassword')}
        className="focus-ring absolute inset-y-0 right-0 flex min-h-[44px] w-11 items-center justify-center rounded-r-lg text-ink-600 hover:text-ink-900"
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
