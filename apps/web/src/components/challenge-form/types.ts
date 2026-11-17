import type { FormFieldType, InnovationFieldMapping } from '@nir/shared';

/** One field of a challenge submission form (mirrors the API's ChallengeFormField). */
export interface ChallengeFormFieldDto {
  id?: string;
  key: string;
  label: string;
  labelBn?: string | null;
  description?: string | null;
  descriptionBn?: string | null;
  type: FormFieldType | `${FormFieldType}`;
  required: boolean;
  placeholder?: string | null;
  placeholderBn?: string | null;
  helpText?: string | null;
  helpTextBn?: string | null;
  options: string[];
  /** Bangla display text, index-aligned with `options` ('' = use English). Answers store `options`. */
  optionsBn?: string[];
  acceptedFileTypes: string[];
  maxFileSizeMb?: number | null;
  maxFiles?: number | null;
  mapsTo?: InnovationFieldMapping | `${InnovationFieldMapping}` | null;
  /** Conditional display: shown only when the earlier choice field with this key has one of `showIfValues`. */
  showIfFieldKey?: string | null;
  showIfValues?: string[];
  sortOrder?: number;
}

/**
 * Keys of the fields currently shown, given the answers so far. Mirrors the server's
 * validateResponses: a conditional field shows only when the field it depends on is itself shown
 * and its answer (a string, or any item of a checkbox list) is one of `showIfValues`. Fields only
 * depend on earlier ones, so one pass in form order settles chains.
 */
export function visibleFieldKeys(fields: ChallengeFormFieldDto[], values: FormValues): Set<string> {
  const visible = new Set<string>();
  for (const f of fields) {
    if (f.showIfFieldKey) {
      if (!visible.has(f.showIfFieldKey)) continue;
      const v = values[f.showIfFieldKey];
      const wanted = f.showIfValues ?? [];
      const met = Array.isArray(v) ? v.some((x) => wanted.includes(x as string)) : typeof v === 'string' && wanted.includes(v);
      if (!met) continue;
    }
    visible.add(f.key);
  }
  return visible;
}

/** The answers to send: drops anything typed into fields that are now hidden (the server ignores them anyway). */
export function visibleValues(fields: ChallengeFormFieldDto[], values: FormValues): FormValues {
  const visible = visibleFieldKeys(fields, values);
  return Object.fromEntries(Object.entries(values).filter(([k]) => visible.has(k)));
}

export interface UploadedFileValue {
  url: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
}

/** A stored answer snapshot (Innovation.challengeResponses entry). */
export interface ChallengeResponseEntry {
  fieldId: string;
  key: string;
  label: string;
  type: string;
  value: string | number | boolean | string[] | null;
  files?: { url: string; name: string; mimeType: string | null; sizeBytes: number }[];
}

export type FormValues = Record<string, unknown>;

export const FIELD_TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: 'Short text',
  LONG_TEXT: 'Long text / text area',
  NUMBER: 'Number',
  EMAIL: 'Email',
  PHONE: 'Phone number',
  SELECT: 'Dropdown / select',
  RADIO: 'Radio buttons',
  CHECKBOX: 'Checkbox(es)',
  DATE: 'Date',
  FILE: 'File upload',
  MULTI_FILE: 'Multiple file upload',
};

export const MAPPING_LABELS: Record<string, string> = {
  TITLE: 'Innovation title',
  SUMMARY: 'Innovation summary',
  PROBLEM_STATEMENT: 'Problem statement',
  PROPOSED_SOLUTION: 'Proposed solution',
};

/** Must match ALLOWED_FILE_EXTENSIONS in apps/api/src/challenges/challenge-rules.ts. */
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm'];
export const UPLOAD_MAX_SIZE_MB = 50;
export const DEFAULT_MAX_FILES = 5;
