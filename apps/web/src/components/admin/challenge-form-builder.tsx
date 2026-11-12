'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { FormFieldType } from '@nir/shared';
import { useAdminChallenge, useSaveChallengeForm } from '@/hooks/use-admin';
import { ApiError } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DynamicForm, validateDynamicForm } from '@/components/challenge-form/dynamic-form';
import {
  ALLOWED_FILE_EXTENSIONS,
  DEFAULT_MAX_FILES,
  FIELD_TYPE_LABELS,
  MAPPING_LABELS,
  UPLOAD_MAX_SIZE_MB,
  type ChallengeFormFieldDto,
  type FormValues,
} from '@/components/challenge-form/types';

const inputCls = 'focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm';
const CHOICE = ['SELECT', 'RADIO', 'CHECKBOX'];
const FILES = ['FILE', 'MULTI_FILE'];
const TEXT = ['SHORT_TEXT', 'LONG_TEXT'];

/** Local editing shape — `uid` keeps React keys / drag targets stable before a field has an id. */
type BuilderField = ChallengeFormFieldDto & { uid: string };

let uidCounter = 0;
const nextUid = () => `f${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

function blankField(type: string): BuilderField {
  return {
    uid: nextUid(),
    key: '',
    label: '',
    description: '',
    type: type as BuilderField['type'],
    required: false,
    placeholder: '',
    helpText: '',
    options: CHOICE.includes(type) && type !== 'CHECKBOX' ? ['Option 1', 'Option 2'] : [],
    acceptedFileTypes: FILES.includes(type) ? ['.pdf'] : [],
    maxFileSizeMb: FILES.includes(type) ? 10 : null,
    maxFiles: type === 'MULTI_FILE' ? DEFAULT_MAX_FILES : null,
    mapsTo: null,
  };
}

/** A sensible starting point so the challenge maps onto the review pipeline's core fields. */
const STARTER_FIELDS: Omit<BuilderField, 'uid'>[] = [
  { key: '', label: 'Innovation / idea title', type: 'SHORT_TEXT', required: true, options: [], acceptedFileTypes: [], mapsTo: 'TITLE', placeholder: 'A short, descriptive name' },
  { key: '', label: 'Summary', type: 'LONG_TEXT', required: true, options: [], acceptedFileTypes: [], mapsTo: 'SUMMARY', helpText: 'Two or three sentences reviewers can read at a glance.' },
  { key: '', label: 'Problem you are solving', type: 'LONG_TEXT', required: true, options: [], acceptedFileTypes: [], mapsTo: 'PROBLEM_STATEMENT' },
  { key: '', label: 'Your proposed solution', type: 'LONG_TEXT', required: true, options: [], acceptedFileTypes: [], mapsTo: 'PROPOSED_SOLUTION' },
  { key: '', label: 'Supporting documents', type: 'MULTI_FILE', required: false, options: [], acceptedFileTypes: ['.pdf', '.docx', '.pptx'], maxFileSizeMb: 10, maxFiles: 3, mapsTo: null },
];

/** Strip builder-only state and blank optionals before sending to PUT /challenges/:id/form. */
function toPayload(fields: BuilderField[]) {
  return fields.map(({ uid, sortOrder, ...f }) => ({
    ...(f.id ? { id: f.id } : {}),
    ...(f.key ? { key: f.key } : {}),
    label: f.label,
    description: f.description || null,
    type: f.type,
    required: f.required,
    placeholder: f.placeholder || null,
    helpText: f.helpText || null,
    options: CHOICE.includes(f.type) ? f.options.filter((o) => o.trim()) : [],
    acceptedFileTypes: FILES.includes(f.type) ? f.acceptedFileTypes : [],
    maxFileSizeMb: FILES.includes(f.type) ? f.maxFileSizeMb ?? null : null,
    maxFiles: f.type === 'MULTI_FILE' ? f.maxFiles ?? null : null,
    mapsTo: TEXT.includes(f.type) ? f.mapsTo || null : null,
  }));
}

function FieldEditor({
  field,
  onChange,
  usedMappings,
}: {
  field: BuilderField;
  onChange: (f: BuilderField) => void;
  usedMappings: string[];
}) {
  const set = <K extends keyof BuilderField>(k: K, v: BuilderField[K]) => onChange({ ...field, [k]: v });
  const id = (s: string) => `fb-${field.uid}-${s}`;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={id('label')} className="mb-1 block text-xs font-medium text-ink-500">Label *</label>
        <input id={id('label')} value={field.label} onChange={(e) => set('label', e.target.value)} className={inputCls} placeholder="e.g. Organisation name" />
      </div>
      <div>
        <label htmlFor={id('type')} className="mb-1 block text-xs font-medium text-ink-500">Field type</label>
        <select
          id={id('type')}
          value={field.type}
          onChange={(e) => {
            const fresh = blankField(e.target.value);
            onChange({
              ...field,
              type: fresh.type,
              options: CHOICE.includes(e.target.value) ? (field.options.length ? field.options : fresh.options) : [],
              acceptedFileTypes: fresh.acceptedFileTypes,
              maxFileSizeMb: fresh.maxFileSizeMb,
              maxFiles: fresh.maxFiles,
              mapsTo: TEXT.includes(e.target.value) ? field.mapsTo : null,
            });
          }}
          className={clsx(inputCls, 'bg-white')}
        >
          {Object.values(FormFieldType).map((t) => (
            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink-700">
        <input type="checkbox" checked={field.required} onChange={(e) => set('required', e.target.checked)} className="focus-ring h-4 w-4 rounded-sm border-2 border-ink-400 text-brand-600" />
        Required
      </label>
      <div className="sm:col-span-2">
        <label htmlFor={id('desc')} className="mb-1 block text-xs font-medium text-ink-500">Description (shown under the label)</label>
        <textarea id={id('desc')} rows={2} value={field.description ?? ''} onChange={(e) => set('description', e.target.value)} className={inputCls} />
      </div>
      {!CHOICE.includes(field.type) && !FILES.includes(field.type) && (
        <div>
          <label htmlFor={id('ph')} className="mb-1 block text-xs font-medium text-ink-500">Placeholder</label>
          <input id={id('ph')} value={field.placeholder ?? ''} onChange={(e) => set('placeholder', e.target.value)} className={inputCls} />
        </div>
      )}
      {field.type === 'CHECKBOX' && field.options.length === 0 && (
        <div>
          <label htmlFor={id('ph')} className="mb-1 block text-xs font-medium text-ink-500">Checkbox text</label>
          <input id={id('ph')} value={field.placeholder ?? ''} onChange={(e) => set('placeholder', e.target.value)} className={inputCls} placeholder="e.g. I agree to the challenge rules" />
        </div>
      )}
      <div className={CHOICE.includes(field.type) || FILES.includes(field.type) ? 'sm:col-span-2' : ''}>
        <label htmlFor={id('help')} className="mb-1 block text-xs font-medium text-ink-500">Help text</label>
        <input id={id('help')} value={field.helpText ?? ''} onChange={(e) => set('helpText', e.target.value)} className={inputCls} />
      </div>

      {CHOICE.includes(field.type) && (
        <div className="sm:col-span-2">
          <label htmlFor={id('opts')} className="mb-1 block text-xs font-medium text-ink-500">
            Options — one per line{field.type === 'CHECKBOX' && ' (leave empty for a single yes/consent checkbox)'}
          </label>
          <textarea
            id={id('opts')}
            rows={Math.max(3, field.options.length + 1)}
            value={field.options.join('\n')}
            onChange={(e) => set('options', e.target.value.split('\n'))}
            className={clsx(inputCls, 'font-mono')}
          />
        </div>
      )}

      {FILES.includes(field.type) && (
        <>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 block text-xs font-medium text-ink-500">Accepted file types (none selected = any allowed type)</legend>
            <div className="flex flex-wrap gap-1.5">
              {ALLOWED_FILE_EXTENSIONS.map((ext) => {
                const on = field.acceptedFileTypes.includes(ext);
                return (
                  <button
                    key={ext}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('acceptedFileTypes', on ? field.acceptedFileTypes.filter((x) => x !== ext) : [...field.acceptedFileTypes, ext])}
                    className={clsx(
                      'focus-ring rounded-full border px-2.5 py-1 font-mono text-xs',
                      on ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-400',
                    )}
                  >
                    {ext}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div>
            <label htmlFor={id('size')} className="mb-1 block text-xs font-medium text-ink-500">Max file size (MB, ≤ {UPLOAD_MAX_SIZE_MB})</label>
            <input id={id('size')} type="number" min={1} max={UPLOAD_MAX_SIZE_MB} value={field.maxFileSizeMb ?? ''} onChange={(e) => set('maxFileSizeMb', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
          </div>
          {field.type === 'MULTI_FILE' && (
            <div>
              <label htmlFor={id('count')} className="mb-1 block text-xs font-medium text-ink-500">Max number of files</label>
              <input id={id('count')} type="number" min={1} max={20} value={field.maxFiles ?? ''} onChange={(e) => set('maxFiles', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
            </div>
          )}
        </>
      )}

      {TEXT.includes(field.type) && (
        <div className="sm:col-span-2">
          <label htmlFor={id('map')} className="mb-1 block text-xs font-medium text-ink-500">
            Use as innovation attribute (shown to reviewers in queues and listings)
          </label>
          <select id={id('map')} value={field.mapsTo ?? ''} onChange={(e) => set('mapsTo', (e.target.value || null) as BuilderField['mapsTo'])} className={clsx(inputCls, 'bg-white')}>
            <option value="">— None —</option>
            {Object.entries(MAPPING_LABELS).map(([k, label]) => (
              <option key={k} value={k} disabled={usedMappings.includes(k) && field.mapsTo !== k}>
                {label}
                {usedMappings.includes(k) && field.mapsTo !== k ? ' (used by another field)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {field.key && <p className="text-xs text-ink-400 sm:col-span-2">Response key: <span className="font-mono">{field.key}</span></p>}
    </div>
  );
}

/**
 * Admin form builder for one challenge's submission form. Edits are local until "Save form",
 * which replaces the whole form via PUT /challenges/:id/form (server re-validates everything).
 * Past submissions keep their own snapshot, so editing here never alters them.
 */
export function ChallengeFormBuilder({ challengeId, onClose }: { challengeId: string; onClose: () => void }) {
  const { data: challenge, isLoading } = useAdminChallenge(challengeId);
  const save = useSaveChallengeForm();

  const [fields, setFields] = useState<BuilderField[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [newType, setNewType] = useState<string>('SHORT_TEXT');
  const [preview, setPreview] = useState(false);
  const [previewValues, setPreviewValues] = useState<FormValues>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BuilderField | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Load (and reload after a save) from the server copy.
  useEffect(() => {
    if (!challenge) return;
    setFields((challenge.formFields ?? []).map((f: ChallengeFormFieldDto) => ({ ...f, uid: f.id ?? nextUid() })));
    setDirty(false);
  }, [challenge]);

  const update = (next: BuilderField[]) => {
    setFields(next);
    setDirty(true);
    setJustSaved(false);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= fields.length || from === to) return;
    const next = [...fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };
  const usedMappings = useMemo(() => fields.map((f) => f.mapsTo).filter(Boolean) as string[], [fields]);
  const previewFields = useMemo(
    () => toPayload(fields).map((f, i) => ({ ...f, key: f.key || `preview_${i}` })) as ChallengeFormFieldDto[],
    [fields],
  );

  const serverErrors =
    save.error instanceof ApiError
      ? (Array.isArray((save.error.details as any)?.message) ? (save.error.details as any).message : [save.error.message])
      : save.error
        ? ['Could not save the form.']
        : [];

  if (isLoading || !challenge) return <p className="text-sm text-ink-400">Loading form…</p>;

  return (
    <div className="rounded-2xl border border-brand-300 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Submission form builder</p>
          <h3 className="mt-1 font-display text-lg font-bold text-ink-900">{challenge.titleEn}</h3>
          <p className="text-xs text-ink-500">
            {challenge.submissionCount ?? 0} submission{challenge.submissionCount === 1 ? '' : 's'} so far — editing the form never changes what was already submitted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setPreview((p) => !p);
              setPreviewErrors({});
            }}
            aria-pressed={preview}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-700 hover:border-ink-400"
          >
            {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {preview ? 'Back to editing' : 'Preview form'}
          </button>
          <button type="button" onClick={onClose} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-600 hover:border-ink-400">
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>

      {preview ? (
        <div className="mt-5 rounded-xl border border-dashed border-ink-100 bg-mist/50 p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-ink-400">Preview — as applicants will see it (file uploads disabled)</p>
          <div className="rounded-xl bg-white p-5">
            <DynamicForm
              fields={previewFields}
              values={previewValues}
              errors={previewErrors}
              preview
              onChange={(k, v) => setPreviewValues((s) => ({ ...s, [k]: v }))}
            />
            <button
              type="button"
              onClick={() => setPreviewErrors(validateDynamicForm(previewFields, previewValues))}
              className="focus-ring mt-6 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white"
            >
              Test validation
            </button>
          </div>
        </div>
      ) : (
        <>
          {fields.length === 0 && (
            <div className="mt-5 rounded-xl border border-dashed border-ink-100 p-6 text-center">
              <p className="text-sm text-ink-600">This challenge has no submission form yet.</p>
              <button
                type="button"
                onClick={() => update(STARTER_FIELDS.map((f) => ({ ...f, uid: nextUid() })))}
                className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                <Wand2 className="h-4 w-4" /> Start from recommended fields
              </button>
            </div>
          )}

          <ol className="mt-5 space-y-2" aria-label="Form fields — drag to reorder, or use the arrow buttons">
            {fields.map((field, index) => {
              const open = editingUid === field.uid;
              return (
                <li
                  key={field.uid}
                  draggable={!open}
                  onDragStart={(e) => {
                    setDragUid(field.uid);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (!dragUid || dragUid === field.uid) return;
                    e.preventDefault();
                    const from = fields.findIndex((f) => f.uid === dragUid);
                    if (from !== -1 && from !== index) move(from, index);
                  }}
                  onDragEnd={() => setDragUid(null)}
                  className={clsx(
                    'rounded-xl border bg-white',
                    open ? 'border-brand-300 p-4' : 'border-ink-100 px-3 py-2.5',
                    dragUid === field.uid && 'opacity-50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {field.label || <span className="italic text-ink-400">Untitled field</span>}
                        {field.required && <span className="text-red-600"> *</span>}
                      </p>
                      <p className="text-xs text-ink-500">
                        {FIELD_TYPE_LABELS[field.type]}
                        {field.mapsTo && ` · maps to ${MAPPING_LABELS[field.mapsTo]}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${field.label || 'field'} up`} className="focus-ring rounded p-1.5 text-ink-400 hover:text-ink-800 disabled:opacity-30">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} aria-label={`Move ${field.label || 'field'} down`} className="focus-ring rounded p-1.5 text-ink-400 hover:text-ink-800 disabled:opacity-30">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setEditingUid(open ? null : field.uid)} aria-expanded={open} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
                        {open ? 'Done' : 'Edit'}
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(field)} aria-label={`Delete ${field.label || 'field'}`} className="focus-ring rounded p-1.5 text-ink-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="mt-4 border-t border-ink-100 pt-4">
                      <FieldEditor field={field} usedMappings={usedMappings} onChange={(f) => update(fields.map((x) => (x.uid === f.uid ? f : x)))} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label htmlFor="fb-new-type" className="sr-only">New field type</label>
            <select id="fb-new-type" value={newType} onChange={(e) => setNewType(e.target.value)} className="focus-ring rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm">
              {Object.values(FormFieldType).map((t) => (
                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const f = blankField(newType);
                update([...fields, f]);
                setEditingUid(f.uid);
              }}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
            >
              <Plus className="h-4 w-4" /> Add field
            </button>
          </div>
        </>
      )}

      {serverErrors.length > 0 && (
        <ul role="alert" className="mt-4 space-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverErrors.map((e: string) => (
            <li key={e} className="flex items-start gap-1.5"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {e}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4">
        <button
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() =>
            save.mutate(
              { id: challengeId, fields: toPayload(fields) },
              { onSuccess: () => { setJustSaved(true); setEditingUid(null); } },
            )
          }
          className="focus-ring rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : 'Save form'}
        </button>
        {dirty && <span className="text-xs font-medium text-amber-deep">Unsaved changes</span>}
        {justSaved && !dirty && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
            <CheckCircle2 className="h-4 w-4" /> Form saved
          </span>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this field?"
        description={`"${confirmDelete?.label || 'Untitled field'}" will be removed from the form when you save. Answers already submitted to it are kept.`}
        confirmLabel="Delete field"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) update(fields.filter((f) => f.uid !== confirmDelete.uid));
          if (editingUid === confirmDelete?.uid) setEditingUid(null);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
