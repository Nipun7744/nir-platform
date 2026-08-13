'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useNewsPost } from '@/hooks/use-content';

export default function NewsDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const locale = useLocale();
  const { data: post, isLoading } = useNewsPost(slug);

  if (isLoading) return <div className="container-page py-24 text-center text-ink-400">Loading…</div>;
  if (!post) return <div className="container-page py-24 text-center text-ink-400">Article not found.</div>;

  return (
    <div className="container-page max-w-3xl py-14">
      <Link href="/news" className="focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to news & events
      </Link>

      <p className="font-mono text-xs uppercase tracking-wide text-ink-400">
        {post.eventDate && new Date(post.eventDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {post.category}
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">
        {locale === 'bn' && post.titleBn ? post.titleBn : post.titleEn}
      </h1>

      {post.coverImageUrl && (
        <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-ink-100">
          <Image src={post.coverImageUrl} alt="" fill className="object-cover" sizes="800px" />
        </div>
      )}

      <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-700">
        {locale === 'bn' && post.bodyBn ? post.bodyBn : post.bodyEn}
      </p>
    </div>
  );
}
