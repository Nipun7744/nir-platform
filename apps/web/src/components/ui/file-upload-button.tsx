'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { uploadFile, type UploadResult } from '@/lib/upload';

export function FileUploadButton({
  label = 'Upload file',
  accept,
  onUploaded,
}: {
  label?: string;
  accept?: string;
  onUploaded: (result: UploadResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="focus-ring inline-flex items-center gap-2 rounded-lg border border-dashed border-ink-200 bg-ink-50 px-4 py-2.5 text-sm font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? 'Uploading…' : label}
      </button>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
