'use client';

import { useTranslations } from 'next-intl';

export function SsoButtons() {
  const t = useTranslations('auth');

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-ink-100" />
        <span className="text-xs uppercase tracking-wide text-ink-400">or</span>
        <div className="h-px flex-1 bg-ink-100" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {['Google', 'Apple', 'Microsoft'].map((provider) => (
          <button
            key={provider}
            type="button"
            disabled
            title={t('ssoNote')}
            className="cursor-not-allowed rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs font-medium text-ink-400"
          >
            {provider}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-ink-400">{t('ssoNote')}</p>
    </div>
  );
}
