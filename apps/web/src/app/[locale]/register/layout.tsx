import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

/** WCAG 2.4.2 Page Titled (2026-11-17): a page-specific, translated <title>. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: `${t('registerPageTitle')} | National Innovation Repository` };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
