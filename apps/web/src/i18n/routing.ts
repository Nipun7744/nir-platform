import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'bn'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Without this, next-intl negotiates the locale from the browser's Accept-Language header on
  // first visit, so a browser preferring Bangla gets redirected to `/bn` even though English is
  // configured as the default. Disabling detection makes `/` always serve English unless the
  // visitor explicitly switches (which still sets the NEXT_LOCALE cookie and is respected).
  localeDetection: false,
});
