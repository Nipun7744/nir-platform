import { setRequestLocale } from 'next-intl/server';
import { InnovationDetail } from '@/components/repository/innovation-detail';

export default async function InnovationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return <InnovationDetail slug={slug} />;
}
