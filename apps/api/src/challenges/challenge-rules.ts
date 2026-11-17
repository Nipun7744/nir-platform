/**
 * Pure rules for challenge-based submissions — no Nest/Prisma runtime imports, so they can be unit
 * tested directly (see apps/api/test/challenge-rules.test.js) and reasoned about in one place.
 *
 *  - `submissionState`        — whether a challenge currently accepts submissions, and why not.
 *  - `normalizeFormDefinition` — validates/normalizes an admin's form-builder payload.
 *  - `validateResponses`      — server-side validation of a submitter's answers against the
 *                                 challenge's current form configuration.
 */

import { UPLOAD_MAX_SIZE_MB } from '../uploads/upload-limits';

export const FORM_FIELD_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'EMAIL',
  'PHONE',
  'SELECT',
  'RADIO',
  'CHECKBOX',
  'DATE',
  'FILE',
  'MULTI_FILE',
] as const;
export type FormFieldTypeName = (typeof FORM_FIELD_TYPES)[number];

export const FIELD_MAPPINGS = ['TITLE', 'SUMMARY', 'PROBLEM_STATEMENT', 'PROPOSED_SOLUTION'] as const;
export type FieldMappingName = (typeof FIELD_MAPPINGS)[number];

/** File extensions a form field may accept — must stay within what POST /uploads allows. */
export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.mp4',
  '.webm',
] as const;

/** Hard ceiling — POST /uploads rejects anything larger regardless of field config. */
export { UPLOAD_MAX_SIZE_MB } from '../uploads/upload-limits';
export const DEFAULT_MAX_FILES = 5;
export const MAX_FILES_CEILING = 20;
export const SHORT_TEXT_MAX = 500;
export const LONG_TEXT_MAX = 20_000;
export const MAX_FIELDS = 60;
/** Most options a dropdown / radio / checkbox field may have (raised from 100 to 200 on 2026-11-16). */
export const MAX_OPTIONS = 200;

const CHOICE_TYPES: FormFieldTypeName[] = ['SELECT', 'RADIO', 'CHECKBOX'];
const FILE_TYPES: FormFieldTypeName[] = ['FILE', 'MULTI_FILE'];
const TEXT_TYPES: FormFieldTypeName[] = ['SHORT_TEXT', 'LONG_TEXT'];

// Uploaded files are always served from /uploads/<server-generated uuid>.<ext> (see
// UploadsController) — never trust anything else as a file reference.
const UPLOAD_URL_RE = /^\/uploads\/[A-Za-z0-9-]{8,}\.[A-Za-z0-9]{1,8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{5,19}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEY_RE = /^[a-z][a-z0-9_]{0,59}$/;

// ---------------------------------------------------------------------------------------------
// Submission window
// ---------------------------------------------------------------------------------------------

export interface ChallengeStateInput {
  status: string;
  isPublished: boolean;
  isActive: boolean;
  submissionsEnabled: boolean;
  categoryId: string | null;
  startDate: Date | string | null;
  deadline: Date | string | null;
  formFieldCount: number;
}

/** Stable reason codes, so the web app can show the reason in Bangla or English. */
export type ClosedCode =
  | 'NOT_PUBLISHED'
  | 'INACTIVE'
  | 'SUBMISSIONS_DISABLED'
  | 'NOT_OPEN_YET'
  | 'NO_LONGER_ACCEPTING'
  | 'DEADLINE_PASSED'
  | 'NOT_CONFIGURED';

export interface SubmissionState {
  acceptingSubmissions: boolean;
  /** Human-readable (English) reason when not accepting; null when accepting. */
  closedReason: string | null;
  /** Machine-readable reason (2026-11-15); null when accepting. */
  closedCode: ClosedCode | null;
}

/** `deadline` is a calendar date (stored at 00:00 UTC) — submissions stay open through that whole day. */
export function submissionState(c: ChallengeStateInput, now: Date = new Date()): SubmissionState {
  const closed = (closedCode: ClosedCode, closedReason: string): SubmissionState => ({
    acceptingSubmissions: false,
    closedReason,
    closedCode,
  });
  if (!c.isPublished) return closed('NOT_PUBLISHED', 'This challenge is not published.');
  if (!c.isActive) return closed('INACTIVE', 'This challenge is currently inactive.');
  if (!c.submissionsEnabled) return closed('SUBMISSIONS_DISABLED', 'Submissions are not enabled for this challenge.');
  if (c.status !== 'OPEN') {
    return c.status === 'UPCOMING'
      ? closed('NOT_OPEN_YET', 'This challenge has not opened yet.')
      : closed('NO_LONGER_ACCEPTING', 'This challenge is no longer accepting submissions.');
  }
  if (c.startDate && now < new Date(c.startDate)) return closed('NOT_OPEN_YET', 'This challenge has not opened yet.');
  if (c.deadline) {
    const end = new Date(c.deadline);
    end.setUTCHours(23, 59, 59, 999);
    if (now > end) return closed('DEADLINE_PASSED', 'The submission deadline has passed.');
  }
  if (!c.categoryId) return closed('NOT_CONFIGURED', 'This challenge is not yet configured for submissions.');
  if (c.formFieldCount < 1) return closed('NOT_CONFIGURED', 'This challenge is not yet configured for submissions.');
  return { acceptingSubmissions: true, closedReason: null, closedCode: null };
}

// ---------------------------------------------------------------------------------------------
// Form definition (admin form builder)
// ---------------------------------------------------------------------------------------------

export interface FormFieldInput {
  id?: string;
  key?: string;
  label: string;
  labelBn?: string | null;
  description?: string | null;
  descriptionBn?: string | null;
  type: string;
  required?: boolean;
  placeholder?: string | null;
  placeholderBn?: string | null;
  helpText?: string | null;
  helpTextBn?: string | null;
  options?: string[];
  optionsBn?: string[];
  acceptedFileTypes?: string[];
  maxFileSizeMb?: number | null;
  maxFiles?: number | null;
  mapsTo?: string | null;
  /** Conditional display: the earlier choice field this one depends on, by its key… */
  showIfFieldKey?: string | null;
  /** …or by its position in this payload (0-based; wins over the key). Lets the builder point at a field that has no key yet. */
  showIfFieldIndex?: number | null;
  /** Options of that field that make this one appear. */
  showIfValues?: string[];
}

export interface NormalizedFormField {
  id?: string;
  key: string;
  label: string;
  labelBn: string | null;
  description: string | null;
  descriptionBn: string | null;
  type: FormFieldTypeName;
  required: boolean;
  placeholder: string | null;
  placeholderBn: string | null;
  helpText: string | null;
  helpTextBn: string | null;
  options: string[];
  /** Index-aligned with `options`; '' where no Bangla text was given. */
  optionsBn: string[];
  acceptedFileTypes: string[];
  maxFileSizeMb: number | null;
  maxFiles: number | null;
  mapsTo: FieldMappingName | null;
  showIfFieldKey: string | null;
  showIfValues: string[];
  sortOrder: number;
}

function slugKey(label: string) {
  const base = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return /^[a-z]/.test(base) ? base : `field_${base}`.replace(/_+$/, '') || 'field';
}

const blankToNull = (v?: string | null) => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/**
 * Validates an admin form-builder payload and returns normalized fields in display order, or a
 * list of human-readable errors. Keys are kept when supplied (so existing response keys stay
 * stable across edits) and generated from the label otherwise.
 */
export function normalizeFormDefinition(fields: FormFieldInput[]): { fields: NormalizedFormField[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(fields)) return { fields: [], errors: ['fields must be an array'] };
  if (fields.length > MAX_FIELDS) errors.push(`A form can have at most ${MAX_FIELDS} fields.`);

  const usedKeys = new Set<string>();
  const usedMappings = new Set<string>();
  const out: NormalizedFormField[] = [];
  /** Normalized field per payload index (undefined where the field was rejected outright). */
  const byIndex: (NormalizedFormField | undefined)[] = [];

  fields.forEach((f, index) => {
    const n = index + 1;
    const label = (f.label ?? '').trim();
    const where = label ? `Field ${n} ("${label}")` : `Field ${n}`;
    if (!label) errors.push(`${where}: a label is required.`);
    if (!FORM_FIELD_TYPES.includes(f.type as FormFieldTypeName)) {
      errors.push(`${where}: unknown field type "${f.type}".`);
      return;
    }
    const type = f.type as FormFieldTypeName;

    let key = (f.key ?? '').trim() || slugKey(label || `field_${n}`);
    if (!KEY_RE.test(key)) {
      errors.push(`${where}: key "${key}" must start with a letter and use only lowercase letters, digits and underscores.`);
    }
    if (usedKeys.has(key)) {
      // Auto-generated duplicates (two fields both labelled "Name") get a numeric suffix; an
      // explicitly supplied duplicate key is an error.
      if (f.key) errors.push(`${where}: key "${key}" is used by another field.`);
      else {
        let i = 2;
        while (usedKeys.has(`${key}_${i}`)) i++;
        key = `${key}_${i}`;
      }
    }
    usedKeys.add(key);

    // Trim/drop empty English options while keeping each Bangla translation paired with its option.
    const optionPairs = (f.options ?? [])
      .map((o, i) => [String(o).trim(), String(f.optionsBn?.[i] ?? '').trim()] as const)
      .filter(([o]) => Boolean(o));
    const options = optionPairs.map(([o]) => o);
    const optionsBn = optionPairs.some(([, bn]) => bn) ? optionPairs.map(([, bn]) => bn) : [];
    if (CHOICE_TYPES.includes(type)) {
      if (type !== 'CHECKBOX' && options.length < 1) errors.push(`${where}: add at least one option.`);
      if (new Set(options).size !== options.length) errors.push(`${where}: options must be unique.`);
    }

    let acceptedFileTypes: string[] = [];
    let maxFileSizeMb: number | null = null;
    let maxFiles: number | null = null;
    if (FILE_TYPES.includes(type)) {
      acceptedFileTypes = (f.acceptedFileTypes ?? [])
        .map((t) => String(t).trim().toLowerCase())
        .filter(Boolean)
        .map((t) => (t.startsWith('.') ? t : `.${t}`));
      const bad = acceptedFileTypes.filter((t) => !(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(t));
      if (bad.length) errors.push(`${where}: unsupported file type(s) ${bad.join(', ')}.`);
      acceptedFileTypes = Array.from(new Set(acceptedFileTypes));
      if (f.maxFileSizeMb != null) {
        const size = Number(f.maxFileSizeMb);
        if (!Number.isInteger(size) || size < 1 || size > UPLOAD_MAX_SIZE_MB) {
          errors.push(`${where}: max file size must be a whole number between 1 and ${UPLOAD_MAX_SIZE_MB} MB.`);
        } else maxFileSizeMb = size;
      }
      if (type === 'MULTI_FILE' && f.maxFiles != null) {
        const count = Number(f.maxFiles);
        if (!Number.isInteger(count) || count < 1 || count > MAX_FILES_CEILING) {
          errors.push(`${where}: max number of files must be between 1 and ${MAX_FILES_CEILING}.`);
        } else maxFiles = count;
      }
    }

    let mapsTo: FieldMappingName | null = null;
    if (f.mapsTo) {
      if (!FIELD_MAPPINGS.includes(f.mapsTo as FieldMappingName)) errors.push(`${where}: unknown mapping "${f.mapsTo}".`);
      else if (!TEXT_TYPES.includes(type)) errors.push(`${where}: only Short Text / Long Text fields can map to an innovation attribute.`);
      else if (usedMappings.has(f.mapsTo)) errors.push(`${where}: another field already maps to ${f.mapsTo}.`);
      else {
        mapsTo = f.mapsTo as FieldMappingName;
        usedMappings.add(f.mapsTo);
      }
    }

    // Placeholder is meaningless for file/choice fields — except a single consent checkbox (CHECKBOX
    // with no options), where it is the text shown next to the box. That text used to be dropped
    // here (fixed 2026-11-15).
    // Conditional display: may only depend on a choice field ABOVE this one (which also rules out
    // cycles), and only on that field's own options.
    let showIfFieldKey: string | null = null;
    let showIfValues: string[] = [];
    const condKey = (f.showIfFieldKey ?? '').trim();
    if (f.showIfFieldIndex != null || condKey) {
      let ctrl: NormalizedFormField | undefined;
      if (f.showIfFieldIndex != null) {
        const ci = Number(f.showIfFieldIndex);
        if (!Number.isInteger(ci) || ci < 0 || ci >= index) errors.push(`${where}: it can only depend on a field above it.`);
        else ctrl = byIndex[ci]; // undefined = that field was itself rejected (already reported)
      } else {
        ctrl = out.find((o) => o.key === condKey);
        if (!ctrl) errors.push(`${where}: it depends on "${condKey}", which is not a field above it.`);
      }
      if (ctrl) {
        if (!CHOICE_TYPES.includes(ctrl.type) || ctrl.options.length === 0) {
          errors.push(`${where}: it can only depend on a dropdown, radio-button or checkbox field with options ("${ctrl.label}" is not one).`);
        } else {
          const wanted = Array.from(new Set((f.showIfValues ?? []).map((v) => String(v).trim()).filter(Boolean)));
          const bad = wanted.filter((v) => !ctrl!.options.includes(v));
          if (!wanted.length) errors.push(`${where}: choose at least one option of "${ctrl.label}" that shows it.`);
          else if (bad.length) errors.push(`${where}: ${bad.map((b) => `"${b}"`).join(', ')} is not an option of "${ctrl.label}".`);
          else {
            showIfFieldKey = ctrl.key;
            showIfValues = ctrl.options.filter((o) => wanted.includes(o)); // admin's option order
          }
        }
      }
    }

    const isConsentBox = type === 'CHECKBOX' && options.length === 0;
    const keepPlaceholder = isConsentBox || !(FILE_TYPES.includes(type) || CHOICE_TYPES.includes(type));
    out.push({
      id: f.id || undefined,
      key,
      label,
      labelBn: blankToNull(f.labelBn),
      description: blankToNull(f.description),
      descriptionBn: blankToNull(f.descriptionBn),
      type,
      required: Boolean(f.required),
      placeholder: keepPlaceholder ? blankToNull(f.placeholder) : null,
      placeholderBn: keepPlaceholder ? blankToNull(f.placeholderBn) : null,
      helpText: blankToNull(f.helpText),
      helpTextBn: blankToNull(f.helpTextBn),
      options: CHOICE_TYPES.includes(type) ? options : [],
      optionsBn: CHOICE_TYPES.includes(type) ? optionsBn : [],
      acceptedFileTypes,
      maxFileSizeMb,
      maxFiles,
      mapsTo,
      showIfFieldKey,
      showIfValues,
      sortOrder: index,
    });
    byIndex[index] = out[out.length - 1];
  });

  return { fields: out, errors };
}

// ---------------------------------------------------------------------------------------------
// Submission responses
// ---------------------------------------------------------------------------------------------

export interface FieldDefinition {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  acceptedFileTypes: string[];
  maxFileSizeMb: number | null;
  maxFiles: number | null;
  mapsTo: string | null;
  showIfFieldKey?: string | null;
  showIfValues?: string[];
}

/**
 * Whether a conditional field's trigger is met by the controlling field's answer: one of
 * `showIfValues` chosen (a SELECT/RADIO string, or any overlap with a CHECKBOX list).
 */
export function conditionMet(controllerValue: unknown, showIfValues: string[]): boolean {
  if (Array.isArray(controllerValue)) return controllerValue.some((v) => showIfValues.includes(v as string));
  return typeof controllerValue === 'string' && showIfValues.includes(controllerValue);
}

export interface SubmittedFile {
  url: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number;
}

/** Snapshot stored in Innovation.challengeResponses — label/type are copied, not referenced. */
export interface ResponseEntry {
  fieldId: string;
  key: string;
  label: string;
  type: string;
  value: string | number | boolean | string[] | null;
  files?: SubmittedFile[];
}

/** Looks up a stored upload by its /uploads URL. Returns null if no such file exists on disk. */
export type FileLookup = (url: string) => { sizeBytes: number } | null;

function isEmpty(v: unknown) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
}

function extOf(path: string) {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i).toLowerCase() : '';
}

function validateFile(field: FieldDefinition, raw: unknown, lookup: FileLookup): { file?: SubmittedFile; error?: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid file reference.' };
  const r = raw as Record<string, unknown>;
  const url = typeof r.url === 'string' ? r.url : '';
  if (!UPLOAD_URL_RE.test(url)) return { error: 'Invalid file reference.' };
  const stored = lookup(url);
  if (!stored) return { error: 'The uploaded file could not be found — please upload it again.' };
  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 255) : url.split('/').pop()!;
  const ext = extOf(url);
  if (field.acceptedFileTypes.length && !field.acceptedFileTypes.includes(ext)) {
    return { error: `"${name}" is not an accepted file type (${field.acceptedFileTypes.join(', ')}).` };
  }
  const maxMb = field.maxFileSizeMb ?? UPLOAD_MAX_SIZE_MB;
  if (stored.sizeBytes > maxMb * 1024 * 1024) return { error: `"${name}" is larger than ${maxMb} MB.` };
  return {
    file: {
      url,
      name,
      mimeType: typeof r.mimeType === 'string' ? r.mimeType.slice(0, 120) : null,
      sizeBytes: stored.sizeBytes, // trust the disk, not the client
    },
  };
}

/**
 * Validates answers against the challenge's current form. Unknown keys are dropped (never stored).
 * Returns per-field errors keyed by field key, plus the normalized snapshot to persist.
 */
export function validateResponses(
  fields: FieldDefinition[],
  responses: Record<string, unknown>,
  lookup: FileLookup,
): { errors: Record<string, string>; entries: ResponseEntry[] } {
  const errors: Record<string, string> = {};
  const entries: ResponseEntry[] = [];
  const input = responses && typeof responses === 'object' && !Array.isArray(responses) ? responses : {};

  for (const field of fields) {
    // Conditional field: skipped entirely (not required, answer dropped) unless the field it
    // depends on was shown, answered validly, and has a triggering value. Fields are processed in
    // form order and may only depend on earlier ones, so the controller is already decided here.
    if (field.showIfFieldKey) {
      const controller = entries.find((e) => e.key === field.showIfFieldKey);
      if (!controller || !conditionMet(controller.value, field.showIfValues ?? [])) continue;
    }

    const raw = input[field.key];
    const base = { fieldId: field.id, key: field.key, label: field.label, type: field.type };
    const fail = (msg: string) => {
      errors[field.key] = msg;
    };

    // A single CHECKBOX with no options is a consent/yes-no box: "required" means it must be ticked.
    const isConsentBox = field.type === 'CHECKBOX' && field.options.length === 0;

    if (isConsentBox) {
      const checked = raw === true || raw === 'true';
      if (field.required && !checked) fail(`${field.label} must be checked.`);
      else entries.push({ ...base, value: checked });
      continue;
    }

    if (isEmpty(raw)) {
      if (field.required) fail(`${field.label} is required.`);
      else entries.push({ ...base, value: null, ...(FILE_TYPES.includes(field.type as FormFieldTypeName) ? { files: [] } : {}) });
      continue;
    }

    switch (field.type) {
      case 'SHORT_TEXT':
      case 'LONG_TEXT': {
        if (typeof raw !== 'string') { fail(`${field.label} must be text.`); break; }
        const value = raw.trim();
        const max = field.type === 'SHORT_TEXT' ? SHORT_TEXT_MAX : LONG_TEXT_MAX;
        if (value.length > max) { fail(`${field.label} must be at most ${max} characters.`); break; }
        entries.push({ ...base, value });
        break;
      }
      case 'NUMBER': {
        const num = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
        if (!Number.isFinite(num)) { fail(`${field.label} must be a number.`); break; }
        entries.push({ ...base, value: num });
        break;
      }
      case 'EMAIL': {
        const value = typeof raw === 'string' ? raw.trim() : '';
        if (!EMAIL_RE.test(value) || value.length > 254) { fail(`${field.label} must be a valid email address.`); break; }
        entries.push({ ...base, value });
        break;
      }
      case 'PHONE': {
        const value = typeof raw === 'string' ? raw.trim() : '';
        if (!PHONE_RE.test(value)) { fail(`${field.label} must be a valid phone number.`); break; }
        entries.push({ ...base, value });
        break;
      }
      case 'DATE': {
        const value = typeof raw === 'string' ? raw.trim() : '';
        const d = new Date(`${value}T00:00:00Z`);
        if (!DATE_RE.test(value) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
          fail(`${field.label} must be a valid date (YYYY-MM-DD).`);
          break;
        }
        entries.push({ ...base, value });
        break;
      }
      case 'SELECT':
      case 'RADIO': {
        if (typeof raw !== 'string' || !field.options.includes(raw)) { fail(`${field.label}: choose one of the listed options.`); break; }
        entries.push({ ...base, value: raw });
        break;
      }
      case 'CHECKBOX': {
        const list = Array.isArray(raw) ? raw : [raw];
        if (!list.every((v) => typeof v === 'string' && field.options.includes(v))) {
          fail(`${field.label}: choose only from the listed options.`);
          break;
        }
        // Keep the admin's option order, drop duplicates.
        const chosen = field.options.filter((o) => (list as string[]).includes(o));
        entries.push({ ...base, value: chosen });
        break;
      }
      case 'FILE':
      case 'MULTI_FILE': {
        const list = Array.isArray(raw) ? raw : [raw];
        const max = field.type === 'FILE' ? 1 : field.maxFiles ?? DEFAULT_MAX_FILES;
        if (list.length > max) { fail(`${field.label}: at most ${max} file${max === 1 ? '' : 's'} allowed.`); break; }
        const files: SubmittedFile[] = [];
        let fileError: string | undefined;
        for (const item of list) {
          const res = validateFile(field, item, lookup);
          if (res.error) { fileError = `${field.label}: ${res.error}`; break; }
          if (!files.some((f) => f.url === res.file!.url)) files.push(res.file!);
        }
        if (fileError) { fail(fileError); break; }
        entries.push({ ...base, value: files.map((f) => f.name), files });
        break;
      }
      default:
        fail(`${field.label}: unsupported field type.`);
    }
  }

  return { errors, entries };
}

/** Text value of the response mapped to a core innovation attribute, if any. */
export function mappedValue(entries: ResponseEntry[], fields: FieldDefinition[], mapping: FieldMappingName): string | null {
  const field = fields.find((f) => f.mapsTo === mapping);
  if (!field) return null;
  const entry = entries.find((e) => e.key === field.key);
  return typeof entry?.value === 'string' && entry.value.trim() ? entry.value.trim() : null;
}
