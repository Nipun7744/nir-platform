import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { RepositoryBrowse } from '@/components/repository/repository-browse';

export default async function RepositoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<div className="container-page py-24 text-center text-ink-400">Loading…</div>}>
      <RepositoryBrowse />
    </Suspense>
  );
}
