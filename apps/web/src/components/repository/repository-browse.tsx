'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useCategories } from '@/hooks/use-content';
import { useRepositorySearch } from '@/hooks/use-repository-search';
import { InnovationCard } from '@/components/ui/innovation-card';
import { CategoryIcon } from '@/components/ui/category-icon';

const STAGES = ['IDEA', 'PROTOTYPE_DEVELOPED', 'PILOT_IMPLEMENTED', 'COMMERCIALIZED', 'SCALED', 'DISCONTINUED'];
const TYPES = ['PRODUCT', 'PROCESS', 'SERVICE', 'DIGITAL_SOLUTION', 'TECHNOLOGY', 'POLICY_INNOVATION', 'RESEARCH_OUTPUT'];

function readableLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function RepositoryBrowse() {
  const t = useTranslations('common');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: categories } = useCategories();

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
  const [developmentStage, setDevelopmentStage] = useState(searchParams.get('developmentStage') ?? '');
  const [innovationType, setInnovationType] = useState(searchParams.get('innovationType') ?? '');
  const [sort, setSort] = useState<'newest' | 'popular' | 'az'>(
    (searchParams.get('sort') as 'newest' | 'popular' | 'az') ?? 'newest',
  );
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params = useMemo(
    () => ({ q, categoryId, developmentStage, innovationType, sort, page, pageSize: 9 }),
    [q, categoryId, developmentStage, innovationType, sort, page],
  );
  const { data, isLoading, isFetching } = useRepositorySearch(params);

  const clearFilters = () => {
    setCategoryId('');
    setDevelopmentStage('');
    setInnovationType('');
    setPage(1);
  };

  const activeFilterCount = [categoryId, developmentStage, innovationType].filter(Boolean).length;

  return (
    <div className="container-page py-10">
      <div className="flex flex-col gap-2 border-b border-ink-100 pb-6">
        <h1 className="font-display text-3xl font-extrabold text-ink-900">Innovation Repository</h1>
        <p className="max-w-2xl text-ink-600">
          Search and browse published innovations from across Bangladesh — by category, development stage, or keyword.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2.5 shadow-card">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title, keyword, or organization…"
            className="w-full bg-transparent text-sm focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search">
              <X className="h-4 w-4 text-ink-400" />
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="focus-ring rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 shadow-card"
        >
          <option value="newest">Newest first</option>
          <option value="popular">Most viewed</option>
          <option value="az">A–Z</option>
        </select>

        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 shadow-card sm:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className={`space-y-6 ${filtersOpen ? 'block' : 'hidden'} sm:block`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Filters</h2>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs font-semibold text-brand-700 hover:underline">
                Clear all
              </button>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Category</h3>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategoryId(categoryId === c.id ? '' : c.id);
                    setPage(1);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                    categoryId === c.id ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <CategoryIcon name={c.icon} className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{locale === 'bn' ? c.nameBn : c.nameEn}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Development Stage</h3>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((stage) => (
                <button
                  key={stage}
                  onClick={() => {
                    setDevelopmentStage(developmentStage === stage ? '' : stage);
                    setPage(1);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    developmentStage === stage
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-ink-100 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {readableLabel(stage)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Innovation Type</h3>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setInnovationType(innovationType === type ? '' : type);
                    setPage(1);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    innovationType === type
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-ink-100 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {readableLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <p className="mb-4 text-sm text-ink-500">
            {isLoading ? t('loading') : `${data?.total ?? 0} innovations found`}
          </p>

          {!isLoading && data?.items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center text-ink-500">
              {t('noResults')}
            </div>
          )}

          <div className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
            {data?.items.map((innovation, i) => (
              <InnovationCard key={innovation.id} innovation={innovation} index={i} />
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {Array.from({ length: data.totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`h-8 w-8 rounded-full text-sm font-semibold transition ${
                    page === i + 1 ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
