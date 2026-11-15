'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileImage, FileText, FileVideo, Paperclip, X } from 'lucide-react';

/**
 * Compact file-attachment list. Images are NOT rendered inline; they show as a row (icon, name,
 * type, size) and open in a lightbox on click. Everything else opens in a new tab. Used wherever
 * reviewers read a challenge submission, to keep the review screen compact (2026-11-15).
 */
export interface AttachmentItem {
  id?: string;
  url: string;
  name: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  /** Secondary context shown under the name, e.g. the challenge question the file answered. */
  context?: string | null;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
const VIDEO_EXT = /\.(mp4|webm)$/i;
// Server-generated storage names (randomUUID() in uploads.controller) or long hex hashes.
const SYSTEM_NAME = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24,})$/i;

function extOf(s: string) {
  return s.split('?')[0].match(/\.([a-z0-9]{1,6})$/i)?.[1] ?? '';
}

/**
 * Human-readable file name: no path, no storage UUID, URL-decoded, whitespace collapsed, and the
 * extension always kept (taken from the URL when the name lacks one).
 */
export function cleanFileName(name: string | null | undefined, url = ''): string {
  let n = (name ?? '').split(/[\\/]/).pop()!.trim();
  try {
    if (/%[0-9a-f]{2}/i.test(n)) n = decodeURIComponent(n);
  } catch {
    /* keep as is */
  }
  n = n.replace(/\s+/g, ' ');
  const ext = extOf(n) || extOf(url);
  const base = extOf(n) ? n.slice(0, -(extOf(n).length + 1)) : n;
  if (!base || SYSTEM_NAME.test(base)) return ext ? `Attachment.${ext.toLowerCase()}` : 'Attachment';
  return ext && !extOf(n) ? `${n}.${ext.toLowerCase()}` : n;
}

/**
 * A file name that never breaks the layout: the base name truncates with "…" while the extension
 * stays visible ("Very long project propo….pdf"); the full name is in the tooltip. The parent must
 * allow shrinking (min-w-0 / flex-1).
 */
export function FileName({ name, url, className = '' }: { name: string | null | undefined; url?: string; className?: string }) {
  const full = cleanFileName(name, url);
  const ext = extOf(full);
  const base = ext ? full.slice(0, -(ext.length + 1)) : full;
  return (
    <span className={`flex min-w-0 max-w-full ${className}`} title={full}>
      <span className="truncate">{base}</span>
      {ext && <span className="shrink-0">.{ext}</span>}
    </span>
  );
}

export function isImageAttachment(a: Pick<AttachmentItem, 'url' | 'mimeType'>) {
  return Boolean(a.mimeType?.startsWith('image/')) || IMAGE_EXT.test(a.url);
}

function typeLabel(a: AttachmentItem) {
  const m = (a.mimeType ?? '').toLowerCase();
  const ext = (a.url.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toUpperCase();
  if (m.startsWith('image/') || IMAGE_EXT.test(a.url)) return `${ext || m.slice(6).toUpperCase()} image`;
  if (m.startsWith('video/') || VIDEO_EXT.test(a.url)) return `${ext || 'Video'} video`;
  if (m === 'application/pdf' || ext === 'PDF') return 'PDF document';
  if (m.includes('word') || ext === 'DOC' || ext === 'DOCX') return 'Word document';
  if (m.includes('presentation') || m.includes('powerpoint') || ext === 'PPT' || ext === 'PPTX') return 'PowerPoint';
  return ext ? `${ext} file` : 'File';
}

function formatSize(bytes?: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function KindIcon({ a }: { a: AttachmentItem }) {
  const cls = 'h-5 w-5 shrink-0';
  if (isImageAttachment(a)) return <FileImage className={`${cls} text-brand-600`} />;
  if (a.mimeType?.startsWith('video/') || VIDEO_EXT.test(a.url)) return <FileVideo className={`${cls} text-brand-600`} />;
  if (a.mimeType === 'application/pdf' || /\.pdf$/i.test(a.url)) return <FileText className={`${cls} text-red-500`} />;
  return <Paperclip className={`${cls} text-ink-500`} />;
}

function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: AttachmentItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const many = images.length > 1;
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + images.length) % images.length),
    [index, images.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (many && e.key === 'ArrowRight') go(1);
      else if (many && e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, many, onClose]);

  const current = images[index];
  const currentName = cleanFileName(current.name, current.url);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview: ${currentName}`}
      className="fixed inset-0 z-[100] flex flex-col bg-ink-900/90"
      onClick={onClose}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
          <FileName name={current.name} url={current.url} />
          {many && <span className="shrink-0 text-white/60">{index + 1} / {images.length}</span>}
        </p>
        <a
          href={current.url}
          target="_blank"
          rel="noreferrer"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open original
        </a>
        <button type="button" onClick={onClose} aria-label="Close preview" className="focus-ring rounded-full p-2 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={currentName}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {many && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="Previous image"
              className="focus-ring absolute left-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="Next image"
              className="focus-ring absolute right-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function AttachmentList({
  items,
  compact = false,
  renderAction,
}: {
  items: AttachmentItem[];
  compact?: boolean;
  /** Optional extra control at the end of a row (e.g. Remove), outside the clickable area. */
  renderAction?: (item: AttachmentItem) => React.ReactNode;
}) {
  const images = items.filter(isImageAttachment);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items.length) return null;

  const rowClass = `focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`;

  return (
    <>
      <ul className="min-w-0 space-y-2">
        {items.map((a) => {
          const meta = [a.context, typeLabel(a), formatSize(a.sizeBytes)].filter(Boolean).join(' · ');
          const body = (
            <>
              <KindIcon a={a} />
              <span className="min-w-0 flex-1">
                <FileName name={a.name} url={a.url} className="text-sm font-medium text-ink-800" />
                <span className="block truncate text-xs text-ink-500" title={meta}>{meta}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-brand-700">{isImageAttachment(a) ? 'Preview' : 'Open'}</span>
            </>
          );
          return (
            <li
              key={a.id ?? a.url}
              className="flex min-w-0 items-center rounded-lg border border-ink-100 bg-white hover:border-brand-300 hover:bg-brand-50/40"
            >
              {isImageAttachment(a) ? (
                <button type="button" className={rowClass} onClick={() => setOpenIndex(images.indexOf(a))}>
                  {body}
                </button>
              ) : (
                <a href={a.url} target="_blank" rel="noreferrer" className={rowClass}>
                  {body}
                </a>
              )}
              {renderAction && <span className="shrink-0 pr-3">{renderAction(a)}</span>}
            </li>
          );
        })}
      </ul>
      {openIndex !== null && images[openIndex] && (
        <ImageLightbox images={images} index={openIndex} onIndexChange={setOpenIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}

/**
 * Maps InnovationAttachment rows to AttachmentItems. Challenge submissions store captions as
 * "<question label>: <file name>" (challenges.service); that's split so the row shows the file
 * name and the question goes to the secondary line.
 */
export function toAttachmentItems(attachments: any[] | undefined | null): AttachmentItem[] {
  return (attachments ?? []).map((a) => {
    const caption: string = a.caption ?? '';
    const m = caption.match(/^(.+?):\s+(.+\.[a-z0-9]{1,6})$/i);
    return {
      id: a.id,
      url: a.url,
      name: m ? m[2] : caption || a.url,
      context: m ? m[1] : null,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    };
  });
}
