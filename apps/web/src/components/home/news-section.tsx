'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useNews } from '@/hooks/use-content';

export function NewsSection() {
  const t = useTranslations('home.news');
  const locale = useLocale();
  const { data } = useNews(1, 3);

  return (
    <section className="bg-white py-[88px]">
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2.5 font-mono text-xs uppercase tracking-[0.08em] text-nirgreen-deep">{t('eyebrow')}</p>
            <h2 className="font-display text-[2.25rem] font-bold text-navy">{t('title')}</h2>
          </div>
          <Link
            href="/news"
            className="focus-ring hidden items-center gap-2 rounded-full border-[1.5px] border-navy px-[18px] py-[9px] text-sm font-semibold text-navy transition hover:bg-navy hover:text-white sm:inline-flex"
          >
            {t('cta')}
          </Link>
        </div>

        <div className="grid gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((post) => (
            <Link
              key={post.id}
              href={`/news/${post.slug}`}
              className="focus-ring group flex flex-col overflow-hidden rounded-[18px] border border-greenline bg-white shadow-card transition hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(19,36,63,.08),0_20px_48px_-16px_rgba(19,36,63,.24)]"
            >
              {post.coverImageUrl && (
                <div className="relative aspect-video w-full overflow-hidden bg-mist-2">
                  <Image
                    src={post.coverImageUrl}
                    alt=""
                    fill
                    className="object-cover transition duration-[400ms] ease-out group-hover:scale-[1.04]"
                    sizes="380px"
                  />
                </div>
              )}
              <div className="grid gap-2 p-[20px_22px_24px]" style={{ padding: '20px 22px 24px' }}>
                <span className="font-mono text-xs text-slate">
                  {post.eventDate &&
                    new Date(post.eventDate)
                      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      .toUpperCase()}{' '}
                  · {post.category}
                </span>
                <h3 className="font-sans text-lg font-bold leading-[1.35] text-navy group-hover:text-nirgreen-dark">
                  {locale === 'bn' && post.titleBn ? post.titleBn : post.titleEn}
                </h3>
                <p className="m-0 line-clamp-2 text-sm text-slate">{locale === 'bn' && post.bodyBn ? post.bodyBn : post.bodyEn}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
