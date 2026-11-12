'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { uploadFile } from '@/lib/upload';
import {
  DEFAULT_MAX_FILES,
  UPLOAD_MAX_SIZE_MB,
  type ChallengeFormFieldDto,
  type FormValues,
  type UploadedFileValue,
} from './types';

const inputCls = 'focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{5,19}$/;

const isConsentBox = (f: ChallengeFormFieldDto) => f.type === 'CHECKBOX' && f.options.length === 0;
const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/**
 * Client-side mirror of the server's validateResponses (apps/api/src/challenges/challenge-rules.ts)
 * for instant feedback. The server re-validates everything and is authoritative.
 */
export function validateDynamicForm(fields: ChallengeFormFieldDto[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.key];
    if (isConsentBox(f)) {
      if (f.required && v !== true) errors[f.key] = `${f.label} must be checked.`;
      continue;
    }
    if (isEmpty(v)) {
      if (f.required) errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if (f.type === 'SHORT_TEXT' && String(v).length > 500) errors[f.key] = 'At most 500 characters.';
    if (f.type === 'LONG_TEXT' && String(v).length > 20000) errors[f.key] = 'At most 20,000 characters.';
    if (f.type === 'NUMBER' && !Number.isFinite(Number(v))) errors[f.key] = 'Enter a number.';
    if (f.type === 'EMAIL' && !EMAIL_RE.test(String(v).trim())) errors[f.key] = 'Enter a valid email address.';
    if (f.type === 'PHONE' && !PHONE_RE.test(String(v).trim())) errors[f.key] = 'Enter a valid phone number.';
    if (f.type === 'MULTI_FILE' && Array.isArray(v) && v.length > (f.maxFiles ?? DEFAULT_MAX_FILES)) {
      errors[f.key] = `At most ${f.maxFiles ?? DEFAULT_MAX_FILES} files.`;
    }
  }
  return errors;
}

function fileExt(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function FileField({
  field,
  value,
  onChange,
  disabled,
  invalid,
}: {
  field: ChallengeFormFieldDto;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const multiple = field.type === 'MULTI_FILE';
  const files: UploadedFileValue[] = multiple ? ((value as UploadedFileValue[]) ?? []) : value ? [value as UploadedFileValue] : [];
  const max = multiple ? field.maxFiles ?? DEFAULT_MAX_FILES : 1;
  const maxMb = field.maxFileSizeMb ?? UPLOAD_MAX_SIZE_MB;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;
    setError(null);
    if (files.length + picked.length > max && multiple) {
      setError(`You can attach at most ${max} files.`);
      return;
    }
    for (const file of picked) {
      if (field.acceptedFileTypes.length && !field.acceptedFileTypes.includes(fileExt(file.name))) {
        setError(`"${file.name}" is not an accepted file type (${field.acceptedFileTypes.join(', ')}).`);
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        setError(`"${file.name}" is larger than ${maxMb} MB.`);
        return;
      }
    }
    setUploading(true);
    try {
      const uploaded: UploadedFileValue[] = [];
      for (const file of picked) {
        const r = await uploadFile(file);
        uploaded.push({ url: r.url, name: r.originalName, mimeType: r.mimeType, sizeBytes: r.sizeBytes });
      }
      onChange(multiple ? [...files, ...uploaded] : uploaded[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const remove = (url: string) => {
    const next = files.filter((f) => f.url !== url);
    onChange(multiple ? next : null);
  };

  return (
    <div>
      {files.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {files.map((f) => (
            <li key={f.url} className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink-700">
                <FileText className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="truncate">{f.name}</span>
              </span>
              {!disabled && (
                <button type="button" onClick={() => remove(f.url)} className="focus-ring rounded p-1 text-ink-400 hover:text-red-600" aria-label={`Remove ${f.name}`}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {files.length < max && (
        <label
          className={clsx(
            'focus-within:ring-2 focus-within:ring-brand-500 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed bg-ink-50 px-4 py-2.5 text-sm font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700',
            invalid ? 'border-red-400' : 'border-ink-100',
            (disabled || uploading) && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading…' : multiple ? 'Add files' : 'Choose file'}
          <input
            type="file"
            className="sr-only"
            multiple={multiple}
            disabled={disabled || uploading}
            accept={field.acceptedFileTypes.length ? field.acceptedFileTypes.join(',') : undefined}
            onChange={handle}
          />
        </label>
      )}
      <p className="mt-1 text-xs text-ink-400">
        {field.acceptedFileTypes.length ? `Accepted: ${field.acceptedFileTypes.join(', ')}. ` : ''}
        Max {maxMb} MB{multiple ? ` per file, up to ${max} files` : ''}.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
  invalid,
}: {
  field: ChallengeFormFieldDto;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const id = `cf-${field.key}`;
  const describedBy = `${id}-help`;
  const cls = clsx(inputCls, invalid && 'border-red-400');
  const common = { id, disabled, 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy };
  const str = (value as string) ?? '';

  switch (field.type) {
    case 'LONG_TEXT':
      return <textarea {...common} rows={5} value={str} placeholder={field.placeholder ?? undefined} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'NUMBER':
      return <input {...common} type="number" inputMode="decimal" value={str} placeholder={field.placeholder ?? undefined} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'EMAIL':
      return <input {...common} type="email" value={str} placeholder={field.placeholder ?? undefined} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'PHONE':
      return <input {...common} type="tel" value={str} placeholder={field.placeholder ?? '+880 1XXX-XXXXXX'} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'DATE':
      return <input {...common} type="date" value={str} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'SELECT':
      return (
        <select {...common} value={str} onChange={(e) => onChange(e.target.value)} className={clsx(cls, 'bg-white')}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    case 'RADIO':
      return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {field.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-ink-700">
              <input type="radio" name={id} disabled={disabled} checked={value === o} onChange={() => onChange(o)} className="focus-ring h-4 w-4 text-brand-600" />
              {o}
            </label>
          ))}
        </div>
      );
    case 'CHECKBOX': {
      if (field.options.length === 0) {
        return (
          <label className="flex items-start gap-2.5 text-sm text-ink-700">
            <input
              id={id}
              type="checkbox"
              disabled={disabled}
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              aria-describedby={describedBy}
              className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded-sm border-2 border-ink-400 text-brand-600"
            />
            <span>{field.placeholder || 'Yes'}</span>
          </label>
        );
      }
      const list = (value as string[]) ?? [];
      return (
        <div role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {field.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                disabled={disabled}
                checked={list.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...list, o] : list.filter((x) => x !== o))}
                className="focus-ring h-4 w-4 rounded-sm border-2 border-ink-400 text-brand-600"
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case 'FILE':
    case 'MULTI_FILE':
      return <FileField field={field} value={value} onChange={onChange} disabled={disabled} invalid={invalid} />;
    case 'SHORT_TEXT':
    default:
      return <input {...common} type="text" value={str} placeholder={field.placeholder ?? undefined} onChange={(e) => onChange(e.target.value)} className={cls} />;
  }
}

/**
 * Renders any challenge's configured submission form. Used by the public submit page and by the
 * admin form builder's preview (with `preview`, inputs are interactive but file uploads are off).
 */
export function DynamicForm({
  fields,
  values,
  onChange,
  errors = {},
  preview = false,
}: {
  fields: ChallengeFormFieldDto[];
  values: FormValues;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
  preview?: boolean;
}) {
  if (fields.length === 0) {
    return <p className="text-sm text-ink-400">This form has no fields yet.</p>;
  }
  return (
    <div className="space-y-6">
      {fields.map((field) => {
        const id = `cf-${field.key}`;
        const error = errors[field.key];
        const isGroup = field.type === 'RADIO' || (field.type === 'CHECKBOX' && field.options.length > 0) || field.type === 'FILE' || field.type === 'MULTI_FILE';
        const LabelTag = isGroup ? 'p' : 'label';
        return (
          <div key={field.key}>
            <LabelTag id={`${id}-label`} {...(isGroup ? {} : { htmlFor: id })} className="mb-1 block text-sm font-medium text-ink-800">
              {field.label}
              {field.required && <span className="text-red-600"> *</span>}
            </LabelTag>
            {field.description && <p className="mb-2 text-sm text-ink-500">{field.description}</p>}
            <FieldInput
              field={field}
              value={values[field.key]}
              onChange={(v) => onChange(field.key, v)}
              disabled={preview && (field.type === 'FILE' || field.type === 'MULTI_FILE')}
              invalid={Boolean(error)}
            />
            <div id={`${id}-help`}>
              {field.helpText && <p className="mt-1 text-xs text-ink-400">{field.helpText}</p>}
              {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
