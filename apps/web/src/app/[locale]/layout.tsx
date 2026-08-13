import type { Metadata } from 'next';
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono, Hind_Siliguri } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
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

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${mono.variable} ${bangla.variable}`}>
      <body className={locale === 'bn' ? 'font-bangla' : 'font-sans'}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <ChallengePopup />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
