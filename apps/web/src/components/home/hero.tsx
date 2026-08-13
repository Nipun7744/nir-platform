'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConfluenceGraphic } from './confluence-graphic';

export function Hero() {
  const t = useTranslations('home');
  const router = useRouter();
  const [query, setQuery] = useState('');

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query ? `/repository?q=${encodeURIComponent(query)}` : '/repository');
  };

  return (
    <section
      className="relative overflow-hidden border-b border-greenline"
      style={{
        background:
          'radial-gradient(1200px 500px at 85% -10%, rgba(0,168,107,.08), transparent 60%), linear-gradient(180deg, #FAFCFB 0%, #FFFFFF 100%)',
      }}
    >
      <div className="container-page grid items-center gap-10 py-[72px] pb-[88px] lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <p className="mb-[18px] font-mono text-xs uppercase tracking-[0.08em] text-nirgreen-deep">
            {t('eyebrow')}
          </p>
          <h1 className="text-balance font-display text-[clamp(2.5rem,5.2vw,4.2rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-navy">
            {t('titleLine1')} <span className="text-nirgreen-deep">{t('titleHighlight')}</span>
          </h1>
          <p className="my-[22px] mb-[30px] max-w-[54ch] text-lg leading-relaxed text-slate">
            {t('description')}
          </p>

          <form
            onSubmit={onSearch}
            className="flex max-w-[560px] items-center rounded-full border-[1.5px] border-navy bg-white py-1.5 pl-[22px] pr-1.5 shadow-card"
          >
            <Search className="h-5 w-5 shrink-0 text-slate" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder={t('searchPlaceholder')}
              className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-base text-navy placeholder:text-[#8494AC] focus:outline-none"
            />
            <button
              type="submit"
              className="focus-ring shrink-0 rounded-full bg-nirgreen-deep px-[18px] py-[9px] text-sm font-semibold text-white transition hover:bg-nirgreen-dark"
            >
              {t('search')}
            </button>
          </form>

          <div className="mt-[26px] flex flex-wrap gap-3.5">
            <Link
              href="/repository"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-nirgreen-deep px-[26px] py-[13px] text-base font-semibold text-white transition hover:bg-nirgreen-dark hover:shadow-[0_8px_20px_-8px_rgba(0,122,78,0.5)]"
            >
              {t('exploreInnovations')}
            </Link>
            <Link
              href="/submit"
              className="focus-ring inline-flex items-center gap-2 rounded-full border-[1.5px] border-navy px-[26px] py-[13px] text-base font-semibold text-navy transition hover:bg-navy hover:text-white"
            >
              {t('submitInnovation')}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          className="hidden lg:block"
          aria-hidden
        >
          <ConfluenceGraphic />
        </motion.div>
      </div>
    </section>
  );
}
