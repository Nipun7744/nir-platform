'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Film, History, ImageOff, Layers, RotateCcw } from 'lucide-react';
import {
  useRepositoryInnovations,
  useRemoveAttachment,
  useReplaceAttachment,
  useInnovationActivityLog,
  useRepositoryActivityLog,
  type RepositoryFilters,
} from '@/hooks/use-repository-admin';
import { useUpdateInnovationStatus, useAddAttachment } from '@/hooks/use-innovations';
import { useCategories } from '@/hooks/use-content';
import { FileUploadButton } from '@/components/ui/file-upload-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { uploadFile } from '@/lib/upload';

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-clay-50 text-clay-700',
  PUBLISHED: 'bg-brand-100 text-brand-800',
  UNPUBLISHED: 'bg-sun-100 text-sun-700',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ActivityLogList({ items, emptyLabel }: { items?: any[]; emptyLabel: string }) {
  if (!items?.length) return <p className="text-xs text-ink-400">{emptyLabel}</p>;
  return (
    <div className="space-y-2">
      {items.map((entry) => (
        <div key={entry.id} className="rounded-lg bg-ink-50 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink-800">{entry.action.replace(/_/g, ' ')}</span>
            <span className="text-ink-400">{new Date(entry.createdAt).toLocaleString()}</span>
          </div>
          <p className="mt-0.5 text-ink-500">
            {entry.actor?.fullName ?? 'System'}
            {entry.metadata?.from && entry.metadata?.to ? ` · ${entry.metadata.from} → ${entry.metadata.to}` : ''}
            {entry.metadata?.previousUrl && entry.metadata?.newUrl ? ' · media file replaced' : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

function MediaManager({ innovation }: { innovation: any }) {
  const addAttachment = useAddAttachment(innovation.id);
  const removeAttachment = useRemoveAttachment(innovation.id);
  const replaceAttachment = useReplaceAttachment(innovation.id);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; caption: string } | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<{
    id: string;
    result: { url: string; originalName: string; mimeType: string; sizeBytes: number };
  } | null>(null);

  const media = (innovation.attachments ?? []).filter((a: any) => a.kind === 'PHOTO' || a.kind === 'VIDEO');

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {media.map((a: any) => (
          <div key={a.id} className="group relative overflow-hidden rounded-lg border border-ink-100">
            {a.kind === 'PHOTO' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt="" className="h-24 w-full object-cover" />
            ) : (
              <div className="flex h-24 w-full items-center justify-center bg-ink-50 text-ink-400">
                <Film className="h-6 w-6" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-navy/70 opacity-0 transition group-hover:opacity-100">
              <label className="focus-ring cursor-pointer rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink-800 hover:bg-white">
                Replace
                <input
                  type="file"
                  accept={a.kind === 'PHOTO' ? 'image/*' : 'video/*'}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    const result = await uploadFile(file);
                    setConfirmReplace({ id: a.id, result });
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setConfirmRemove({ id: a.id, caption: a.caption ?? a.kind })}
                className="focus-ring rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {media.length === 0 && <p className="col-span-full text-xs text-ink-400">No photos or videos uploaded yet.</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <FileUploadButton
          label="Upload photo"
          accept="image/*"
          onUploaded={(r) => addAttachment.mutate({ kind: 'PHOTO', url: r.url, caption: r.originalName, mimeType: r.mimeType, sizeBytes: r.sizeBytes })}
        />
        <FileUploadButton
          label="Upload video"
          accept="video/*"
          onUploaded={(r) => addAttachment.mutate({ kind: 'VIDEO', url: r.url, caption: r.originalName, mimeType: r.mimeType, sizeBytes: r.sizeBytes })}
        />
      </div>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title="Remove this media file?"
        description={`"${confirmRemove?.caption}" will be permanently removed from this innovation. This cannot be undone.`}
        confirmLabel="Remove"
        pending={removeAttachment.isPending}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={async () => {
          if (!confirmRemove) return;
          await removeAttachment.mutateAsync(confirmRemove.id);
          setConfirmRemove(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmReplace)}
        title="Replace this media file?"
        description="The current file will be swapped for the newly uploaded one. This cannot be undone."
        confirmLabel="Replace"
        pending={replaceAttachment.isPending}
        onCancel={() => setConfirmReplace(null)}
        onConfirm={async () => {
          if (!confirmReplace) return;
          await replaceAttachment.mutateAsync({
            attachmentId: confirmReplace.id,
            url: confirmReplace.result.url,
            caption: confirmReplace.result.originalName,
            mimeType: confirmReplace.result.mimeType,
            sizeBytes: confirmReplace.result.sizeBytes,
          });
          setConfirmReplace(null);
        }}
      />
    </div>
  );
}

function RepositoryRow({ innovation }: { innovation: any }) {
  const updateStatus = useUpdateInnovationStatus(innovation.id);
  const [showMedia, setShowMedia] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<'PUBLISHED' | 'UNPUBLISHED' | null>(null);
  const { data: activity } = useInnovationActivityLog(innovation.id, showActivity) as { data?: { items: any[] } };

  const photo = (innovation.attachments ?? []).find((a: any) => a.kind === 'PHOTO');
  const isPublished = innovation.reviewStatus === 'PUBLISHED';
  const statusLabel =
    innovation.reviewStatus === 'PUBLISHED'
      ? `Published ${formatDate(innovation.publishedAt)}`
      : innovation.reviewStatus === 'UNPUBLISHED'
        ? `Unpublished · last published ${formatDate(innovation.publishedAt)}`
        : 'Approved · not yet published';

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-50">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300">
              <ImageOff className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-400">
            {innovation.innovationCode} · {innovation.category?.nameEn}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/repository/${innovation.slug}`} className="font-display text-base font-bold text-ink-900 hover:text-brand-700">
              {innovation.titleEn}
            </Link>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[innovation.reviewStatus] ?? 'bg-ink-50 text-ink-500'}`}>
              {innovation.reviewStatus}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-500">{statusLabel}</p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isPublished ? (
            <button
              onClick={() => setConfirmStatus('UNPUBLISHED')}
              className="focus-ring rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => setConfirmStatus('PUBLISHED')}
              className="focus-ring rounded-lg border border-brand-200 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => setShowMedia((v) => !v)}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
              showMedia ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-700 hover:border-brand-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Media
          </button>
          <button
            onClick={() => setShowActivity((v) => !v)}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
              showActivity ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-700 hover:border-brand-300'
            }`}
          >
            <History className="h-3.5 w-3.5" /> Activity
          </button>
        </div>
      </div>

      {showMedia && <MediaManager innovation={innovation} />}
      {showActivity && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          <ActivityLogList items={activity?.items} emptyLabel="No admin activity recorded yet for this innovation." />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmStatus)}
        title={confirmStatus === 'PUBLISHED' ? 'Publish this innovation?' : 'Unpublish this innovation?'}
        description={
          confirmStatus === 'PUBLISHED'
            ? innovation.reviewStatus === 'UNPUBLISHED'
              ? 'This innovation will become visible again on the public repository.'
              : 'This innovation will go live on the public repository for the first time.'
            : 'This innovation will be removed from the public repository immediately and will no longer be visible to public viewers until republished.'
        }
        confirmLabel={confirmStatus === 'PUBLISHED' ? 'Publish' : 'Unpublish'}
        danger={confirmStatus === 'UNPUBLISHED'}
        pending={updateStatus.isPending}
        onCancel={() => setConfirmStatus(null)}
        onConfirm={async () => {
          if (!confirmStatus) return;
          await updateStatus.mutateAsync({ reviewStatus: confirmStatus });
          setConfirmStatus(null);
        }}
      />
    </div>
  );
}

export default function RepositoryManagementPage() {
  const [filters, setFilters] = useState<RepositoryFilters>({});
  const { data, isLoading } = useRepositoryInnovations(filters) as {
    data?: { items: any[]; total: number };
    isLoading: boolean;
  };
  const { data: categories } = useCategories();
  const [showActivity, setShowActivity] = useState(false);
  const { data: activity } = useRepositoryActivityLog() as { data?: { items: any[] } };

  const hasFilters = Boolean(filters.q || filters.categoryId || filters.status || filters.fromDate || filters.toDate);
  const set = (patch: Partial<RepositoryFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Repository Management</h1>
      <p className="mt-1 text-ink-600">
        View, publish, and unpublish innovations in the public repository, and manage their photos and videos.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Search</label>
          <input
            type="search"
            placeholder="Title or innovation code…"
            value={filters.q ?? ''}
            onChange={(e) => set({ q: e.target.value || undefined })}
            className="focus-ring w-56 rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Status</label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => set({ status: (e.target.value || undefined) as RepositoryFilters['status'] })}
            className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
          >
            <option value="">All</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNPUBLISHED">Unpublished</option>
            <option value="APPROVED">Approved (not yet published)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Category</label>
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) => set({ categoryId: e.target.value || undefined })}
            className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">Published date</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.fromDate ?? ''}
              max={filters.toDate || undefined}
              onChange={(e) => set({ fromDate: e.target.value || undefined })}
              aria-label="From date"
              className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
            />
            <span className="text-ink-400">–</span>
            <input
              type="date"
              value={filters.toDate ?? ''}
              min={filters.fromDate || undefined}
              onChange={(e) => set({ toDate: e.target.value || undefined })}
              aria-label="To date"
              className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
            />
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={() => setFilters({})}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-600 hover:border-clay-400"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset filters
          </button>
        )}
        <button
          onClick={() => setShowActivity((v) => !v)}
          className={`focus-ring ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
            showActivity ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-700 hover:border-brand-300'
          }`}
        >
          <History className="h-3.5 w-3.5" /> Recent activity
        </button>
      </div>

      {showActivity && (
        <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
          <h2 className="font-display text-sm font-bold text-ink-900">Recent repository activity</h2>
          <div className="mt-2">
            <ActivityLogList items={activity?.items} emptyLabel="No admin activity recorded yet." />
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {data?.items?.map((innovation) => (
          <RepositoryRow key={innovation.id} innovation={innovation} />
        ))}
        {!isLoading && data?.items?.length === 0 && (
          <p className="text-ink-400">
            {hasFilters ? 'No innovations match the selected filters.' : 'No published or unpublished innovations yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
