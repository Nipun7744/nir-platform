'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import clsx from 'clsx';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('common');
  // Focus ring only on keyboard focus — the switcher looks the same at rest (WCAG 2.4.7).
  const focusCls =
    'outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy';

  const go = (target: 'en' | 'bn') => {
    if (target === locale) return;
    router.replace(pathname, { locale: target });
  };

  return (
    <div role="group" aria-label={t('languageGroup')} className="flex gap-0.5 rounded-full border border-navy-line p-0.5">
      <button
        type="button"
        lang="en"
        aria-pressed={locale === 'en'}
        onClick={() => go('en')}
        className={clsx(
          'rounded-full px-3 py-[3px] text-xs transition',
          focusCls,
          locale === 'en' ? 'bg-white font-semibold text-navy' : 'text-[#C7D4E8]',
        )}
      >
        EN
      </button>
      <button
        type="button"
        lang="bn"
        aria-pressed={locale === 'bn'}
        onClick={() => go('bn')}
        className={clsx(
          'rounded-full px-3 py-[3px] text-xs transition',
          focusCls,
          locale === 'bn' ? 'bg-white font-semibold text-navy' : 'text-[#C7D4E8]',
        )}
      >
        বাংলা
      </button>
    </div>
  );
}
