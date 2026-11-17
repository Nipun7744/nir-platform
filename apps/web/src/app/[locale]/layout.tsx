import type { Metadata } from 'next';
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono, Hind_Siliguri } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from './providers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ChallengePopup } from '@/components/layout/challenge-popup';
import '../globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-display' });
const sans = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });
const bangla = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['400', '600'],
  variable: '--font-bangla',
});

export const metadata: Metadata = {
  title: 'National Innovation Repository | Bangladesh',
  description:
    "The National Innovation Repository documents, evaluates, and connects innovations across Bangladesh's government, academia, industry, and citizens.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${mono.variable} ${bangla.variable}`}>
      <body className={locale === 'bn' ? 'font-bangla' : 'font-sans'}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {/* WCAG 2.4.1 Bypass Blocks (2026-11-17): first Tab stop, visible only when focused. */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-brand-800 focus:shadow-card focus:outline-none focus:ring-2 focus:ring-nirgreen-deep focus:ring-offset-2"
            >
              {tCommon('skipToContent')}
            </a>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
                {children}
              </main>
              <SiteFooter />
            </div>
            <ChallengePopup />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
