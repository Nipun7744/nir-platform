import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/hero';
import { StatsStrip } from '@/components/home/stats-strip';
import { QuickLinks } from '@/components/home/quick-links';
import { FeaturedInnovations } from '@/components/home/featured-innovations';
import { CategoryGrid } from '@/components/home/category-grid';
import { ChallengeBanner } from '@/components/home/challenge-banner';
import { NewsSection } from '@/components/home/news-section';
import { PartnersStrip } from '@/components/home/partners-strip';

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
