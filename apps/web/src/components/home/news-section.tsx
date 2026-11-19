'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useNews } from '@/hooks/use-content';
import { textLang } from '@/lib/text-lang';

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

        {/* A list of cards (no visual change, 2026-11-17). */}
        <ul className="grid gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((post) => {
            const title = locale === 'bn' && post.titleBn ? post.titleBn : post.titleEn;
            const body = locale === 'bn' && post.bodyBn ? post.bodyBn : post.bodyEn;
            return (
            <li key={post.id} className="flex">
            <Link
              href={`/news/${post.slug}`}
              className="focus-ring group flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-greenline bg-white shadow-card transition hover:-translate-y-1 hover:shadow-glow"
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
                {/* The date is always formatted in English (en-GB) — say so on the Bangla site. */}
                <span className="font-mono text-xs text-slate" lang={locale === 'en' ? undefined : 'en'}>
                  {post.eventDate &&
                    new Date(post.eventDate)
                      .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                      .toUpperCase()}{' '}
                  · {post.category}
                </span>
                <h3 className="font-sans text-lg font-bold leading-[1.35] text-navy group-hover:text-nirgreen-dark" lang={textLang(title, locale)}>
                  {title}
                </h3>
                <p className="m-0 line-clamp-2 text-sm text-slate" lang={textLang(body, locale)}>
                  {body}
                </p>
              </div>
            </Link>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
