'use client';

import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useResources } from '@/hooks/use-content';

const TYPES = [
  { value: '', label: 'All' },
  { value: 'GUIDELINE', label: 'Guidelines' },
  { value: 'POLICY', label: 'Policies & Strategies' },
  { value: 'SOP', label: 'SOPs' },
  { value: 'MANUAL', label: 'Manuals & Handbooks' },
  { value: 'TEMPLATE', label: 'Templates & Forms' },
  { value: 'REPORT', label: 'Reports & Publications' },
  { value: 'TOOLKIT', label: 'Toolkits' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcesPage() {
  const [type, setType] = useState('');
  const { data, isLoading } = useResources(type || undefined) as { data: any[]; isLoading: boolean };

  return (
    <div className="container-page py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Resources</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">Guidelines, policies & toolkits</h1>

      <div className="mt-8 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              type === t.value ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-600 hover:border-ink-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {data?.map((doc) => (
          <a
            key={doc.id}
            href={doc.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:border-brand-300"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-ink-900">{doc.titleEn}</h2>
                <p className="text-xs uppercase tracking-wide text-ink-400">
                  {doc.type.replace(/_/g, ' ')} · {doc.fileType.toUpperCase()} · {formatBytes(doc.fileSizeBytes)}
                </p>
              </div>
            </div>
            <Download className="h-5 w-5 shrink-0 text-ink-400" />
          </a>
        ))}
        {!isLoading && data?.length === 0 && <p className="text-ink-400">No resources in this category yet.</p>}
      </div>
    </div>
  );
}
