'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with a show/hide (eye) toggle. Only switches the input's `type`; the value,
 * validation attributes (required/minLength/…) and autocomplete are passed through untouched.
 * The toggle is type="button" so it never submits the form.
 */
export function PasswordInput({ className = '', ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const t = useTranslations('auth');
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        aria-pressed={visible}
        title={visible ? t('hidePassword') : t('showPassword')}
        className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-400 hover:text-ink-700"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
