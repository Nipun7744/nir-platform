'use client';

import { useId, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertCircle, ArrowDown, ArrowUp, Plus, Settings2, Trash2, X } from 'lucide-react';
import {
  DETAIL_FIELD_TYPES,
  DETAIL_FIELD_TYPE_LABELS,
  DETAIL_LIMITS,
  DETAIL_PATTERN_TYPES,
  isChoiceDetailType,
  isTextDetailType,
  normalizeDetailFields,
  validateDetailFields,
  type ChallengeDetailField,
  type DetailFieldIssue,
  type DetailFieldType,
  type DetailFieldValidation,
} from '@nir/shared';
import { useUploadFile } from '@/hooks/use-admin';

/**
 * Configurable challenge details fields (2026-11-18) — the per-challenge field list in the admin
 * Create / Edit challenge form. Each field is set up (section, label, input type, placeholder, help
 * text, options, validation — English + Bangla) and filled in on the same card. The rules are the
 * shared ones from @nir/shared, which the API applies again on save.
 */

/** Editing shape: `uid` keeps React keys stable before a new field has a key. */
export type EditorDetailField = ChallengeDetailField & { uid: string };

let uidCounter = 0;
const nextUid = () => `d${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export const withUids = (fields: ChallengeDetailField[] | null | undefined): EditorDetailField[] =>
  (fields ?? []).map((f) => ({ ...structuredClone(f), uid: nextUid() }));

/** Editor state → API payload (drops the editor-only `uid`). */
export const detailFieldsPayload = (fields: EditorDetailField[]): ChallengeDetailField[] =>
  fields.map(({ uid: _uid, ...f }) => f);

/** Every problem in the list, exactly as the API would report them. */
export const detailFieldIssues = (fields: EditorDetailField[]): DetailFieldIssue[] =>
  validateDetailFields(normalizeDetailFields(detailFieldsPayload(fields)));

const inputCls = 'focus-ring w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm';
const labelCls = 'mb-1 block text-xs font-medium text-ink-600';
const smallBtn = 'focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-ink-300';
const iconBtn = 'focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 hover:text-ink-800 disabled:opacity-30';

export function ChallengeDetailFieldsEditor({
  fields,
  onChange,
  showSection = true,
  addLabel = 'Add field',
}: {
  fields: EditorDetailField[];
  onChange: (fields: EditorDetailField[]) => void;
  /** false = no "Section / level" setting (e.g. the contact fields, shown as one flat list). */
  showSection?: boolean;
  addLabel?: string;
}) {
  const [openSetup, setOpenSetup] = useState<Set<string>>(() => new Set());
  const issues = useMemo(() => detailFieldIssues(fields), [fields]);

  const update = (uid: string, patch: Partial<ChallengeDetailField>) =>
    onChange(fields.map((f) => (f.uid === uid ? { ...f, ...patch } : f)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...fields];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const toggleSetup = (uid: string, open?: boolean) =>
    setOpenSetup((s) => {
      const n = new Set(s);
      if (open ?? !n.has(uid)) n.add(uid);
      else n.delete(uid);
      return n;
    });
  const addField = () => {
    const f: EditorDetailField = { uid: nextUid(), key: '', labelEn: '', type: 'SHORT_TEXT' };
    onChange([...fields, f]);
    toggleSetup(f.uid, true);
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-200 bg-white px-4 py-6 text-center text-sm text-ink-500">
          No fields yet — use “{addLabel}” to create the first one.
        </p>
      )}

      <ol className="space-y-3">
        {fields.map((f, i) => (
          <FieldCard
            key={f.uid}
            field={f}
            index={i}
            count={fields.length}
            issues={issues.filter((x) => x.index === i)}
            setupOpen={openSetup.has(f.uid)}
            onToggleSetup={() => toggleSetup(f.uid)}
            onChange={(patch) => update(f.uid, patch)}
            onMove={(by) => move(i, by)}
            onRemove={() => onChange(fields.filter((x) => x.uid !== f.uid))}
            showSection={showSection}
          />
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addField} disabled={fields.length >= DETAIL_LIMITS.maxFields} className={smallBtn}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> {addLabel}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------ one field

function FieldCard({
  field: f,
  index,
  count,
  issues,
  setupOpen,
  onToggleSetup,
  onChange,
  onMove,
  onRemove,
  showSection,
}: {
  field: EditorDetailField;
  index: number;
  count: number;
  issues: DetailFieldIssue[];
  setupOpen: boolean;
  onToggleSetup: () => void;
  onChange: (patch: Partial<ChallengeDetailField>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  showSection: boolean;
}) {
  const id = useId();
  const setupIssues = issues.filter((x) => x.scope === 'setup');
  const valueIssues = issues.filter((x) => x.scope === 'value');
  const title = f.labelEn || 'Untitled field';
  const required = Boolean(f.validation?.required);

  return (
    <li className={clsx('rounded-xl border bg-white p-3 sm:p-4', issues.length ? 'border-red-200' : 'border-ink-100')}>
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink-900">
            <span className="text-ink-400">{index + 1}.</span>
            <span className="min-w-0 break-words">{title}</span>
            {required && <span className="text-red-600" aria-label="required">*</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-ink-50 px-2 py-0.5 font-medium text-ink-600">{DETAIL_FIELD_TYPE_LABELS[f.type] ?? f.type}</span>
            {f.sectionEn && <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-800">Section: {f.sectionEn}</span>}
            {f.labelBn && <span className="rounded-full bg-mist px-2 py-0.5 font-medium text-ink-600" lang="bn">{f.labelBn}</span>}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className={iconBtn} aria-label={`Move "${title}" up`}>
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className={iconBtn} aria-label={`Move "${title}" down`}>
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleSetup}
            aria-expanded={setupOpen}
            aria-controls={`${id}-setup`}
            className={clsx(smallBtn, setupOpen && 'border-brand-300 text-brand-800', setupIssues.length && 'border-red-300 text-red-700')}
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden /> {setupOpen ? 'Close set-up' : 'Set up'}
          </button>
          <button type="button" onClick={onRemove} className={clsx(iconBtn, 'hover:text-red-600')} aria-label={`Remove "${title}"`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* set-up */}
      {setupOpen && (
        <div id={`${id}-setup`} className="mt-3 rounded-lg border border-ink-100 bg-ink-50/50 p-3">
          <FieldSetup field={f} onChange={onChange} showSection={showSection} />
          <IssueList issues={setupIssues} />
        </div>
      )}
      {!setupOpen && <IssueList issues={setupIssues} />}

      {/* value */}
      <div className="mt-3">
        <ValueInput field={f} onChange={onChange} />
        <IssueList issues={valueIssues} />
      </div>
    </li>
  );
}

function IssueList({ issues }: { issues: DetailFieldIssue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {issues.map((x, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {x.message}
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------------------------ set-up

/** A pair of English / Bangla inputs for one setting. */
function Bilingual({
  label,
  en,
  bn,
  onEn,
  onBn,
  max,
  multiline,
  requiredEn,
}: {
  label: string;
  en?: string;
  bn?: string;
  onEn: (v: string) => void;
  onBn: (v: string) => void;
  max: number;
  multiline?: boolean;
  requiredEn?: boolean;
}) {
  const id = useId();
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <label htmlFor={`${id}-en`} className={labelCls}>
          {label} (English){requiredEn && <span className="text-red-600"> *</span>}
        </label>
        <Tag id={`${id}-en`} value={en ?? ''} maxLength={max} rows={multiline ? 2 : undefined} onChange={(e) => onEn(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${id}-bn`} className={labelCls}>
          {label} (বাংলা)
        </label>
        <Tag id={`${id}-bn`} lang="bn" value={bn ?? ''} maxLength={max} rows={multiline ? 2 : undefined} onChange={(e) => onBn(e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}

function NumberSetting({ label, value, onChange, step }: { label: string; value?: number; onChange: (v: number | undefined) => void; step?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input
        id={id}
        type="number"
        step={step ?? '1'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={inputCls}
      />
    </div>
  );
}

function FieldSetup({
  field: f,
  onChange,
  showSection,
}: {
  field: EditorDetailField;
  onChange: (patch: Partial<ChallengeDetailField>) => void;
  showSection: boolean;
}) {
  const id = useId();
  const rules = f.validation ?? {};
  const setRule = (patch: Partial<DetailFieldValidation>) => onChange({ validation: { ...rules, ...patch } });
  const options = f.options ?? [];
  const setOptions = (next: { en: string; bn?: string }[]) => onChange({ options: next });

  const changeType = (type: DetailFieldType) => {
    // Values rarely survive a type change (e.g. text → date), so start the value afresh; keep it
    // only between text types and between the single-choice types.
    const keep =
      (isTextDetailType(type) && isTextDetailType(f.type)) ||
      (['SELECT', 'RADIO'].includes(type) && ['SELECT', 'RADIO'].includes(f.type));
    onChange({
      type,
      value: keep ? f.value : undefined,
      valueBn: keep ? f.valueBn : undefined,
      options: isChoiceDetailType(type) ? (options.length ? options : [{ en: '' }]) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {showSection && (
        <>
          <Bilingual
            label="Section / level"
            en={f.sectionEn}
            bn={f.sectionBn}
            onEn={(v) => onChange({ sectionEn: v })}
            onBn={(v) => onChange({ sectionBn: v })}
            max={DETAIL_LIMITS.section}
          />
          <p className="-mt-2 text-xs text-ink-500">
            Fields with the same section name are grouped under one heading on the challenge page, each with its label as a sub-heading.
            Leave blank to show the field as its own section, headed by its label.
          </p>
        </>
      )}
      <Bilingual
        label="Field label"
        en={f.labelEn}
        bn={f.labelBn}
        onEn={(v) => onChange({ labelEn: v })}
        onBn={(v) => onChange({ labelBn: v })}
        max={DETAIL_LIMITS.label}
        requiredEn
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-type`} className={labelCls}>Input type</label>
          <select id={`${id}-type`} value={f.type} onChange={(e) => changeType(e.target.value as DetailFieldType)} className={inputCls}>
            {DETAIL_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{DETAIL_FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink-800">
          <input
            type="checkbox"
            checked={Boolean(rules.required)}
            onChange={(e) => setRule({ required: e.target.checked || undefined })}
            className="h-4 w-4 rounded border-ink-300 text-brand-600"
          />
          Required — the challenge can&apos;t be saved while it&apos;s empty
        </label>
      </div>
      <Bilingual
        label="Placeholder"
        en={f.placeholderEn}
        bn={f.placeholderBn}
        onEn={(v) => onChange({ placeholderEn: v })}
        onBn={(v) => onChange({ placeholderBn: v })}
        max={DETAIL_LIMITS.placeholder}
      />
      <Bilingual
        label="Help text"
        en={f.helpTextEn}
        bn={f.helpTextBn}
        onEn={(v) => onChange({ helpTextEn: v })}
        onBn={(v) => onChange({ helpTextBn: v })}
        max={DETAIL_LIMITS.helpText}
        multiline
      />

      {isChoiceDetailType(f.type) && (
        <fieldset>
          <legend className={labelCls}>Options — the English text is what gets stored; Bangla is shown on the Bangla site</legend>
          <ul className="space-y-2">
            {options.map((o, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <input
                  aria-label={`Option ${i + 1} (English)`}
                  placeholder={`Option ${i + 1}`}
                  value={o.en}
                  maxLength={DETAIL_LIMITS.option}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))}
                  className={clsx(inputCls, 'min-w-0 flex-1')}
                />
                <input
                  aria-label={`Option ${i + 1} (Bangla)`}
                  placeholder="বাংলা (ঐচ্ছিক)"
                  lang="bn"
                  value={o.bn ?? ''}
                  maxLength={DETAIL_LIMITS.option}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, bn: e.target.value } : x)))}
                  className={clsx(inputCls, 'min-w-0 flex-1')}
                />
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className={clsx(iconBtn, 'hover:text-red-600')}
                  aria-label={`Remove option ${i + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setOptions([...options, { en: '' }])}
            disabled={options.length >= DETAIL_LIMITS.maxOptions}
            className={clsx(smallBtn, 'mt-2')}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add option
          </button>
        </fieldset>
      )}

      {(isTextDetailType(f.type) || f.type === 'NUMBER' || f.type === 'CHECKBOX' || DETAIL_PATTERN_TYPES.includes(f.type)) && (
        <fieldset>
          <legend className={labelCls}>Validation rules</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {isTextDetailType(f.type) && (
              <>
                <NumberSetting label="Minimum length (characters)" value={rules.minLength} onChange={(v) => setRule({ minLength: v })} />
                <NumberSetting label="Maximum length (characters)" value={rules.maxLength} onChange={(v) => setRule({ maxLength: v })} />
              </>
            )}
            {f.type === 'NUMBER' && (
              <>
                <NumberSetting label="Minimum value" value={rules.min} onChange={(v) => setRule({ min: v })} step="any" />
                <NumberSetting label="Maximum value" value={rules.max} onChange={(v) => setRule({ max: v })} step="any" />
              </>
            )}
            {f.type === 'CHECKBOX' && (
              <>
                <NumberSetting label="Minimum choices" value={rules.min} onChange={(v) => setRule({ min: v })} />
                <NumberSetting label="Maximum choices" value={rules.max} onChange={(v) => setRule({ max: v })} />
              </>
            )}
          </div>
          {DETAIL_PATTERN_TYPES.includes(f.type) && (
            <div className="mt-2 space-y-2">
              <div>
                <label htmlFor={`${id}-pattern`} className={labelCls}>
                  Pattern (regular expression the whole English value must match, optional) — e.g. <code className="font-mono">[A-Z]{'{3}'}-\d+</code>
                </label>
                <input
                  id={`${id}-pattern`}
                  value={rules.pattern ?? ''}
                  maxLength={DETAIL_LIMITS.pattern}
                  onChange={(e) => setRule({ pattern: e.target.value || undefined })}
                  className={clsx(inputCls, 'font-mono')}
                />
              </div>
              {rules.pattern && (
                <Bilingual
                  label="Message when the pattern doesn't match"
                  en={rules.patternMessageEn}
                  bn={rules.patternMessageBn}
                  onEn={(v) => setRule({ patternMessageEn: v || undefined })}
                  onBn={(v) => setRule({ patternMessageBn: v || undefined })}
                  max={DETAIL_LIMITS.patternMessage}
                />
              )}
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------ value

function ValueInput({ field: f, onChange }: { field: EditorDetailField; onChange: (patch: Partial<ChallengeDetailField>) => void }) {
  const id = useId();
  const upload = useUploadFile();
  const label = f.labelEn || 'Untitled field';
  const required = Boolean(f.validation?.required);
  const help = f.helpTextEn ? <p id={`${id}-help`} className="mt-1 text-xs text-ink-500">{f.helpTextEn}</p> : null;
  const describedBy = f.helpTextEn ? `${id}-help` : undefined;
  const value = typeof f.value === 'string' ? f.value : '';
  const options = (f.options ?? []).filter((o) => o.en.trim());
  const heading = (
    <span className={labelCls}>
      {label}
      {required && <span className="text-red-600"> *</span>}
    </span>
  );

  if (isTextDetailType(f.type)) {
    const Tag = f.type === 'LONG_TEXT' ? 'textarea' : 'input';
    const max = f.type === 'LONG_TEXT' ? DETAIL_LIMITS.longText : DETAIL_LIMITS.shortText;
    return (
      <div>
        <div className="grid gap-2 lg:grid-cols-2">
          <div>
            <label htmlFor={`${id}-en`} className={labelCls}>
              {label}
              {required && <span className="text-red-600"> *</span>} <span className="font-normal text-ink-400">— English</span>
            </label>
            <Tag
              id={`${id}-en`}
              rows={f.type === 'LONG_TEXT' ? 4 : undefined}
              value={value}
              maxLength={max}
              placeholder={f.placeholderEn}
              aria-describedby={describedBy}
              onChange={(e) => onChange({ value: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor={`${id}-bn`} className={labelCls}>
              {f.labelBn || label} <span className="font-normal text-ink-400">— বাংলা (optional; blank shows English)</span>
            </label>
            <Tag
              id={`${id}-bn`}
              lang="bn"
              rows={f.type === 'LONG_TEXT' ? 4 : undefined}
              value={f.valueBn ?? ''}
              maxLength={max}
              placeholder={f.placeholderBn}
              aria-describedby={describedBy}
              onChange={(e) => onChange({ valueBn: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        {help}
      </div>
    );
  }

  if (f.type === 'CHECKBOX') {
    const picked = Array.isArray(f.value) ? f.value : [];
    return (
      <fieldset aria-describedby={describedBy}>
        <legend>{heading}</legend>
        {options.length === 0 ? (
          <p className="text-xs text-ink-500">Add options in the set-up first.</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {options.map((o) => (
              <label key={o.en} className="flex min-h-[32px] items-center gap-2 text-sm text-ink-800">
                <input
                  type="checkbox"
                  checked={picked.includes(o.en)}
                  onChange={(e) => onChange({ value: e.target.checked ? [...picked, o.en] : picked.filter((x) => x !== o.en) })}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600"
                />
                {o.en}
              </label>
            ))}
          </div>
        )}
        {help}
      </fieldset>
    );
  }

  if (f.type === 'RADIO') {
    return (
      <fieldset aria-describedby={describedBy}>
        <legend>{heading}</legend>
        {options.length === 0 ? (
          <p className="text-xs text-ink-500">Add options in the set-up first.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {options.map((o) => (
              <label key={o.en} className="flex min-h-[32px] items-center gap-2 text-sm text-ink-800">
                <input type="radio" name={`${id}-radio`} checked={value === o.en} onChange={() => onChange({ value: o.en })} className="h-4 w-4 border-ink-300 text-brand-600" />
                {o.en}
              </label>
            ))}
            {value && (
              <button type="button" onClick={() => onChange({ value: undefined })} className="text-xs font-semibold text-ink-500 hover:text-ink-800">
                Clear
              </button>
            )}
          </div>
        )}
        {help}
      </fieldset>
    );
  }

  if (f.type === 'SELECT') {
    return (
      <div>
        <label htmlFor={`${id}-v`}>{heading}</label>
        <select id={`${id}-v`} value={value} aria-describedby={describedBy} onChange={(e) => onChange({ value: e.target.value || undefined })} className={inputCls}>
          <option value="">{f.placeholderEn || '— Not set —'}</option>
          {options.map((o) => (
            <option key={o.en} value={o.en}>{o.en}</option>
          ))}
        </select>
        {help}
      </div>
    );
  }

  if (f.type === 'FILE') {
    return (
      <div>
        <label htmlFor={`${id}-v`}>{heading}</label>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            id={`${id}-v`}
            value={value}
            placeholder={f.placeholderEn || 'https://… or upload a file'}
            aria-describedby={describedBy}
            onChange={(e) => onChange({ value: e.target.value })}
            className={clsx(inputCls, 'min-w-0 flex-1')}
          />
          <label className={clsx(smallBtn, 'cursor-pointer self-center')}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file, { onSuccess: (data) => onChange({ value: data.url }) });
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {upload.isError && <p className="mt-1 text-xs text-red-700">Upload failed — PDF, Word, PowerPoint, Excel or image, up to 50 MB.</p>}
        {help}
      </div>
    );
  }

  const inputType: Partial<Record<DetailFieldType, string>> = { NUMBER: 'number', EMAIL: 'email', PHONE: 'tel', URL: 'url', DATE: 'date' };
  return (
    <div>
      <label htmlFor={`${id}-v`}>{heading}</label>
      <input
        id={`${id}-v`}
        type={inputType[f.type] ?? 'text'}
        step={f.type === 'NUMBER' ? 'any' : undefined}
        value={value}
        placeholder={f.placeholderEn}
        aria-describedby={describedBy}
        onChange={(e) => onChange({ value: e.target.value })}
        className={inputCls}
      />
      {help}
    </div>
  );
}
