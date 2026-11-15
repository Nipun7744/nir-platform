'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { uploadFile } from '@/lib/upload';
import { FileName, cleanFileName } from '@/components/ui/attachment-list';
import { localizeField } from '@/lib/challenge-i18n';
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

type FormT = ReturnType<typeof useTranslations<'challenges.form'>>;

/**
 * Client-side mirror of the server's validateResponses (apps/api/src/challenges/challenge-rules.ts)
 * for instant feedback, in the visitor's language. The server re-validates everything and is
 * authoritative.
 */
export function validateDynamicForm(
  fields: ChallengeFormFieldDto[],
  values: FormValues,
  t: FormT,
  locale: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const loc = localizeField(locale);
  for (const f of fields) {
    const v = values[f.key];
    const label = loc(f).label;
    if (isConsentBox(f)) {
      if (f.required && v !== true) errors[f.key] = t('mustCheck', { label });
      continue;
    }
    if (isEmpty(v)) {
      if (f.required) errors[f.key] = t('required', { label });
      continue;
    }
    if (f.type === 'SHORT_TEXT' && String(v).length > 500) errors[f.key] = t('maxChars', { count: 500 });
    if (f.type === 'LONG_TEXT' && String(v).length > 20000) errors[f.key] = t('maxChars', { count: 20000 });
    if (f.type === 'NUMBER' && !Number.isFinite(Number(v))) errors[f.key] = t('number');
    if (f.type === 'EMAIL' && !EMAIL_RE.test(String(v).trim())) errors[f.key] = t('email');
    if (f.type === 'PHONE' && !PHONE_RE.test(String(v).trim())) errors[f.key] = t('phone');
    if (f.type === 'MULTI_FILE' && Array.isArray(v) && v.length > (f.maxFiles ?? DEFAULT_MAX_FILES)) {
      errors[f.key] = t('maxFiles', { count: f.maxFiles ?? DEFAULT_MAX_FILES });
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
  const t = useTranslations('challenges.form');

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;
    setError(null);
    if (files.length + picked.length > max && multiple) {
      setError(t('tooManyFiles', { max }));
      return;
    }
    for (const file of picked) {
      if (field.acceptedFileTypes.length && !field.acceptedFileTypes.includes(fileExt(file.name))) {
        setError(t('badType', { name: cleanFileName(file.name), types: field.acceptedFileTypes.join(', ') }));
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        setError(t('tooLarge', { name: cleanFileName(file.name), mb: maxMb }));
        return;
      }
    }
    setUploading(true);
    try {
      // In parallel; Promise.all keeps the picked order, and any failure attaches none of them.
      const uploaded: UploadedFileValue[] = (await Promise.all(picked.map(uploadFile))).map((r) => ({
        url: r.url,
        name: r.originalName,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
      }));
      onChange(multiple ? [...files, ...uploaded] : uploaded[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
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
              <span className="flex min-w-0 flex-1 items-center gap-2 text-ink-700">
                <FileText className="h-4 w-4 shrink-0 text-brand-600" />
                <FileName name={f.name} url={f.url} />
              </span>
              {!disabled && (
                <button type="button" onClick={() => remove(f.url)} className="focus-ring shrink-0 rounded p-1 text-ink-400 hover:text-red-600" aria-label={t('remove', { name: cleanFileName(f.name, f.url) })}>
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
          {uploading ? t('uploading') : multiple ? t('addFiles') : t('chooseFile')}
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
        {field.acceptedFileTypes.length ? `${t('accepted', { types: field.acceptedFileTypes.join(', ') })} ` : ''}
        {multiple ? t('maxSizeMulti', { mb: maxMb, max }) : t('maxSize', { mb: maxMb })}
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
  const t = useTranslations('challenges.form');
  const text = localizeField(useLocale())(field);
  const placeholder = text.placeholder ?? undefined;

  switch (field.type) {
    case 'LONG_TEXT':
      return <textarea {...common} rows={5} value={str} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'NUMBER':
      return <input {...common} type="number" inputMode="decimal" value={str} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'EMAIL':
      return <input {...common} type="email" value={str} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'PHONE':
      return <input {...common} type="tel" value={str} placeholder={placeholder ?? '+880 1XXX-XXXXXX'} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'DATE':
      return <input {...common} type="date" value={str} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case 'SELECT':
      // Values stay the English option (what's validated and stored); only the visible text changes.
      return (
        <select {...common} value={str} onChange={(e) => onChange(e.target.value)} className={clsx(cls, 'bg-white')}>
          <option value="">{t('select')}</option>
          {field.options.map((o) => (
            <option key={o} value={o}>{text.optionLabel(o)}</option>
          ))}
        </select>
      );
    case 'RADIO':
      return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {field.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-ink-700">
              <input type="radio" name={id} disabled={disabled} checked={value === o} onChange={() => onChange(o)} className="focus-ring h-4 w-4 text-brand-600" />
              {text.optionLabel(o)}
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
            <span>{placeholder || t('yes')}</span>
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
              {text.optionLabel(o)}
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
  const t = useTranslations('challenges.form');
  const loc = localizeField(useLocale());
  if (fields.length === 0) {
    return <p className="text-sm text-ink-400">{t('noFields')}</p>;
  }
  return (
    <div className="space-y-6">
      {fields.map((field) => {
        const id = `cf-${field.key}`;
        const error = errors[field.key];
        const text = loc(field);
        // Radio/checkbox lists and file pickers have no single input for a <label htmlFor>.
        const isGroup =
          field.type === 'RADIO' || field.type === 'FILE' || field.type === 'MULTI_FILE' || (field.type === 'CHECKBOX' && !isConsentBox(field));
        const LabelTag = isGroup ? 'p' : 'label';
        return (
          <div key={field.key}>
            <LabelTag id={`${id}-label`} {...(isGroup ? {} : { htmlFor: id })} className="mb-1 block text-sm font-medium text-ink-800">
              {text.label}
              {field.required && <span className="text-red-600"> *</span>}
            </LabelTag>
            {text.description && <p className="mb-2 text-sm text-ink-500">{text.description}</p>}
            <FieldInput
              field={field}
              value={values[field.key]}
              onChange={(v) => onChange(field.key, v)}
              disabled={preview && (field.type === 'FILE' || field.type === 'MULTI_FILE')}
              invalid={Boolean(error)}
            />
            <div id={`${id}-help`}>
              {text.helpText && <p className="mt-1 text-xs text-ink-400">{text.helpText}</p>}
              {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
