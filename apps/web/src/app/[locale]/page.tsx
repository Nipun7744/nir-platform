import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/hero';
import { StatsStrip } from '@/components/home/stats-strip';
import { QuickLinks } from '@/components/home/quick-links';
import { FeaturedInnovations } from '@/components/home/featured-innovations';
import { CategoryGrid } from '@/components/home/category-grid';
import { ChallengeBanner } from '@/components/home/challenge-banner';
import { NewsSection } from '@/components/home/news-section';
import { PartnersStrip } from '@/components/home/partners-strip';

/** WCAG 2.4.2 Page Titled: the home page's <title> in the page language (2026-11-17). */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('pageTitle') };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <StatsStrip />
      <QuickLinks />
      <FeaturedInnovations />
      <CategoryGrid />
      <ChallengeBanner />
      <NewsSection />
      <PartnersStrip />
    </>
  );
}
