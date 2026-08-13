'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import clsx from 'clsx';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const go = (target: 'en' | 'bn') => {
    if (target === locale) return;
    router.replace(pathname, { locale: target });
  };

  return (
    <div role="group" aria-label="Language" className="flex gap-0.5 rounded-full border border-navy-line p-0.5">
      <button
        type="button"
        lang="en"
        onClick={() => go('en')}
        className={clsx(
          'rounded-full px-3 py-[3px] text-xs transition',
          locale === 'en' ? 'bg-white font-semibold text-navy' : 'text-[#C7D4E8]',
        )}
      >
        EN
      </button>
      <button
        type="button"
        lang="bn"
        onClick={() => go('bn')}
        className={clsx(
          'rounded-full px-3 py-[3px] text-xs transition',
          locale === 'bn' ? 'bg-white font-semibold text-navy' : 'text-[#C7D4E8]',
        )}
      >
        বাংলা
      </button>
    </div>
  );
}
