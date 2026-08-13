'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useNews } from '@/hooks/use-content';

export default function NewsPage() {
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNews(page, 9);

  return (
    <div className="container-page py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">News & Events</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">From the ecosystem</h1>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-ink-50" />)}
        {data?.items.map((post) => (
          <Link key={post.id} href={`/news/${post.slug}`} className="focus-ring group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lg">
            {post.coverImageUrl && (
              <div className="relative h-44 w-full overflow-hidden">
                <Image src={post.coverImageUrl} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" sizes="380px" />
              </div>
            )}
            <div className="p-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-400">
                {post.eventDate && new Date(post.eventDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {post.category}
              </p>
              <h2 className="mt-2 font-display text-base font-bold leading-snug text-ink-900 group-hover:text-brand-700">
                {locale === 'bn' && post.titleBn ? post.titleBn : post.titleEn}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-ink-600">{locale === 'bn' && post.bodyBn ? post.bodyBn : post.bodyEn}</p>
            </div>
          </Link>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {Array.from({ length: data.totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`h-8 w-8 rounded-full text-sm font-semibold ${page === i + 1 ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
