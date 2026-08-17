'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pinned = new Set([1, total, current, current - 1, current + 1, current - 2, current + 2]);
  const pages = [...pinned].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | '…')[] = [];
  let prev = 0;
  for (const p of pages) {
    if (prev && p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

/**
 * Server-side pagination bar: record count summary, optional page-size selector, and
 * Previous/page-number/Next navigation with ellipsis windowing for large page counts.
 * First reusable pagination component in this codebase — see UI_GUIDELINES.md.
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink-100 pt-4">
      <p className="text-xs text-ink-500">
        Showing <span className="font-semibold text-ink-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-ink-700">{total}</span>
        {totalPages > 1 && (
          <>
            {' '}
            · Page <span className="font-semibold text-ink-700">{page}</span> of {totalPages}
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-ink-500">
            Per page
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="focus-ring rounded-lg border border-ink-100 px-2 py-1 text-sm text-ink-700"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="focus-ring rounded-lg border border-ink-200 p-1.5 text-ink-600 hover:border-brand-300 disabled:opacity-40 disabled:hover:border-ink-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {pageWindow(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-ink-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`focus-ring h-8 w-8 rounded-lg text-sm font-semibold transition ${
                    p === page ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="focus-ring rounded-lg border border-ink-200 p-1.5 text-ink-600 hover:border-brand-300 disabled:opacity-40 disabled:hover:border-ink-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
