/**
 * Configurable challenge-details fields (2026-11-18).
 *
 * Each challenge carries its own ordered list of detail fields (stored as JSON in
 * `Challenge.detailFields`). An administrator defines every field — the section it is grouped
 * under, its label, input type, placeholder, help text, options and validation rules, each in
 * English and Bangla — and fills in its value in the same Create/Edit challenge form. The public
 * challenge page renders the filled fields grouped by section.
 *
 * This module is the single source of truth for the shape and the rules: the API normalizes and
 * validates with it before saving, and the admin form runs the same checks for inline errors.
 * Keep it dependency-free — it is compiled for both the NestJS API and the Next.js app.
 */

export const DETAIL_FIELD_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'EMAIL',
  'PHONE',
  'URL',
  'DATE',
  'SELECT',
  'RADIO',
  'CHECKBOX',
  'FILE',
] as const;
export type DetailFieldType = (typeof DETAIL_FIELD_TYPES)[number];

export const DETAIL_FIELD_TYPE_LABELS: Record<DetailFieldType, string> = {
  SHORT_TEXT: 'Short text',
  LONG_TEXT: 'Long text (paragraphs)',
  NUMBER: 'Number',
  EMAIL: 'Email address',
  PHONE: 'Phone number',
  URL: 'Web link (URL)',
  DATE: 'Date',
  SELECT: 'Dropdown (one choice)',
  RADIO: 'Radio buttons (one choice)',
  CHECKBOX: 'Checkboxes (several choices)',
  FILE: 'File / document',
};

/** Types whose value is free text written separately in English and Bangla. */
export const DETAIL_TEXT_TYPES: readonly DetailFieldType[] = ['SHORT_TEXT', 'LONG_TEXT'];
/** Types whose value is picked from `options`. */
export const DETAIL_CHOICE_TYPES: readonly DetailFieldType[] = ['SELECT', 'RADIO', 'CHECKBOX'];
/** Types a regular-expression rule can apply to. */
export const DETAIL_PATTERN_TYPES: readonly DetailFieldType[] = ['SHORT_TEXT', 'LONG_TEXT', 'PHONE'];

export const DETAIL_LIMITS = {
  maxFields: 50,
  maxOptions: 100,
  key: 60,
  section: 120,
  label: 200,
  placeholder: 200,
  helpText: 500,
  option: 200,
  pattern: 200,
  patternMessage: 200,
  shortText: 500,
  longText: 10000,
  url: 500,
} as const;

export interface DetailFieldOption {
  /** English option text — also the stored value, so answers don't depend on the language. */
  en: string;
  /** Bangla display text; blank → the Bangla site shows the English text. */
  bn?: string;
}

export interface DetailFieldValidation {
  required?: boolean;
  /** Text types: character limits, applied to the English and the Bangla text separately. */
  minLength?: number;
  maxLength?: number;
  /** NUMBER: value range. CHECKBOX: how many options may be ticked. */
  min?: number;
  max?: number;
  /** Text / phone: a regular expression the English value must match in full. */
  pattern?: string;
  patternMessageEn?: string;
  patternMessageBn?: string;
}

export interface ChallengeDetailField {
  /** Stable machine key, unique within the challenge; generated from the label when blank. */
  key: string;
  /** Section heading the field is grouped under on the public page; blank → its own section. */
  sectionEn?: string;
  sectionBn?: string;
  labelEn: string;
  labelBn?: string;
  type: DetailFieldType;
  placeholderEn?: string;
  placeholderBn?: string;
  helpTextEn?: string;
  helpTextBn?: string;
  options?: DetailFieldOption[];
  validation?: DetailFieldValidation;
  /** CHECKBOX → string[] of English options; everything else → a string ('' / absent = empty). */
  value?: string | string[];
  /** SHORT_TEXT / LONG_TEXT only: the Bangla text (falls back to `value` on the Bangla site). */
  valueBn?: string;
}

export interface DetailFieldIssue {
  /** Position in the list, so the admin form can show the message next to the field. */
  index: number;
  /** 'setup' = the field definition is wrong; 'value' = the content breaks a rule. */
  scope: 'setup' | 'value';
  message: string;
}

// ------------------------------------------------------------------------------------ helpers

const isType = (t: unknown): t is DetailFieldType => DETAIL_FIELD_TYPES.includes(t as DetailFieldType);

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
/** Trimmed string, or undefined when blank — so optional keys are omitted from the stored JSON. */
const opt = (v: unknown): string | undefined => str(v) || undefined;
const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

/** Machine key from an English label: "Who can apply?" → "who_can_apply". */
export function detailFieldKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/** Whether a field has content worth showing (the public page hides empty fields). */
export function detailFieldHasValue(f: Pick<ChallengeDetailField, 'value' | 'valueBn'>): boolean {
  if (Array.isArray(f.value)) return f.value.length > 0;
  return Boolean(str(f.value) || str(f.valueBn));
}

export function isTextDetailType(t: DetailFieldType) {
  return DETAIL_TEXT_TYPES.includes(t);
}
export function isChoiceDetailType(t: DetailFieldType) {
  return DETAIL_CHOICE_TYPES.includes(t);
}

/**
 * Cleans untrusted input into the stored shape: trims every string, rebuilds each object key by
 * key (unknown keys are dropped), removes settings that don't apply to the field's type, and fills
 * in missing/duplicate keys. Invalid values are kept as-is so `validateDetailFields` can report
 * them — always validate the result before saving.
 */
export function normalizeDetailFields(input: unknown): ChallengeDetailField[] {
  if (!Array.isArray(input)) return [];
  const used = new Set<string>();
  return input.map((raw, i) => {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const type = (isType(r.type) ? r.type : str(r.type)) as DetailFieldType;
    const labelEn = str(r.labelEn);

    let key = detailFieldKey(str(r.key)) || detailFieldKey(labelEn) || `field_${i + 1}`;
    if (used.has(key)) {
      let n = 2;
      while (used.has(`${key}_${n}`)) n++;
      key = `${key}_${n}`;
    }
    used.add(key);

    const field: ChallengeDetailField = {
      key,
      sectionEn: opt(r.sectionEn),
      sectionBn: opt(r.sectionBn),
      labelEn,
      labelBn: opt(r.labelBn),
      type,
      placeholderEn: opt(r.placeholderEn),
      placeholderBn: opt(r.placeholderBn),
      helpTextEn: opt(r.helpTextEn),
      helpTextBn: opt(r.helpTextBn),
    };

    if (isChoiceDetailType(type)) {
      const options = Array.isArray(r.options) ? r.options : [];
      field.options = options
        .map((o) => {
          const oo = (o && typeof o === 'object' ? o : { en: o }) as Record<string, unknown>;
          const bn = opt(oo.bn);
          return bn ? { en: str(oo.en), bn } : { en: str(oo.en) };
        })
        .filter((o) => o.en);
    }

    const v = (r.validation && typeof r.validation === 'object' ? r.validation : {}) as Record<string, unknown>;
    const validation: DetailFieldValidation = {};
    if (v.required === true) validation.required = true;
    if (isTextDetailType(type)) {
      validation.minLength = num(v.minLength);
      validation.maxLength = num(v.maxLength);
    }
    if (type === 'NUMBER' || type === 'CHECKBOX') {
      validation.min = num(v.min);
      validation.max = num(v.max);
    }
    if (DETAIL_PATTERN_TYPES.includes(type) && str(v.pattern)) {
      validation.pattern = str(v.pattern);
      validation.patternMessageEn = opt(v.patternMessageEn);
      validation.patternMessageBn = opt(v.patternMessageBn);
    }
    const cleanValidation = Object.fromEntries(
      Object.entries(validation).filter(([, x]) => x !== undefined),
    ) as DetailFieldValidation;
    if (Object.keys(cleanValidation).length) field.validation = cleanValidation;

    if (type === 'CHECKBOX') {
      const list = Array.isArray(r.value) ? r.value : r.value ? [r.value] : [];
      const values = [...new Set(list.map(str).filter(Boolean))];
      if (values.length) field.value = values;
    } else {
      const value = Array.isArray(r.value) ? str(r.value[0]) : typeof r.value === 'number' ? String(r.value) : str(r.value);
      if (value) field.value = value;
      if (isTextDetailType(type)) field.valueBn = opt(r.valueBn);
    }

    // Drop undefined keys so the stored JSON stays tidy.
    return Object.fromEntries(Object.entries(field).filter(([, x]) => x !== undefined)) as unknown as ChallengeDetailField;
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9 ()\-]{4,19}$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const FILE_RE = /^(https?:\/\/[^\s]+|\/uploads\/[^\s]+)$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(v: string) {
  if (!DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Compiles an admin-entered pattern, anchored to the whole value; null when it doesn't compile. */
export function compileDetailPattern(pattern: string): RegExp | null {
  try {
    return new RegExp(`^(?:${pattern})$`, 'u');
  } catch {
    return null;
  }
}

const isNonNegInt = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/**
 * Checks normalized fields — first the field set-up, then each value against its rules.
 * Returns every problem (empty array = valid). Messages are English: the admin UI is English.
 */
export function validateDetailFields(fields: ChallengeDetailField[]): DetailFieldIssue[] {
  const issues: DetailFieldIssue[] = [];
  if (fields.length > DETAIL_LIMITS.maxFields) {
    issues.push({ index: DETAIL_LIMITS.maxFields, scope: 'setup', message: `A challenge can have at most ${DETAIL_LIMITS.maxFields} detail fields.` });
  }
  const seenLabels = new Map<string, number>();

  fields.forEach((f, index) => {
    const setup = (message: string) => issues.push({ index, scope: 'setup', message });
    const value = (message: string) => issues.push({ index, scope: 'value', message });
    const name = f.labelEn ? `"${f.labelEn}"` : `Field ${index + 1}`;

    // ---------------------------------------------------------------- set-up
    if (!f.labelEn) setup(`${name}: the English label is required.`);
    if (!isType(f.type)) {
      setup(`${name}: choose an input type.`);
      return;
    }
    const tooLong: [keyof ChallengeDetailField, number, string][] = [
      ['sectionEn', DETAIL_LIMITS.section, 'section (English)'],
      ['sectionBn', DETAIL_LIMITS.section, 'section (Bangla)'],
      ['labelEn', DETAIL_LIMITS.label, 'label (English)'],
      ['labelBn', DETAIL_LIMITS.label, 'label (Bangla)'],
      ['placeholderEn', DETAIL_LIMITS.placeholder, 'placeholder (English)'],
      ['placeholderBn', DETAIL_LIMITS.placeholder, 'placeholder (Bangla)'],
      ['helpTextEn', DETAIL_LIMITS.helpText, 'help text (English)'],
      ['helpTextBn', DETAIL_LIMITS.helpText, 'help text (Bangla)'],
    ];
    for (const [k, max, what] of tooLong) {
      const s = f[k];
      if (typeof s === 'string' && s.length > max) setup(`${name}: the ${what} can be at most ${max} characters.`);
    }
    if (f.labelEn) {
      const sameLabel = `${(f.sectionEn ?? '').toLowerCase()}|${f.labelEn.toLowerCase()}`;
      if (seenLabels.has(sameLabel)) setup(`${name}: another field in the same section already has this label.`);
      else seenLabels.set(sameLabel, index);
    }

    const options = f.options ?? [];
    if (isChoiceDetailType(f.type)) {
      if (!options.length) setup(`${name}: add at least one option.`);
      if (options.length > DETAIL_LIMITS.maxOptions) setup(`${name}: at most ${DETAIL_LIMITS.maxOptions} options.`);
      const seen = new Set<string>();
      for (const o of options) {
        if (o.en.length > DETAIL_LIMITS.option || (o.bn?.length ?? 0) > DETAIL_LIMITS.option) {
          setup(`${name}: each option can be at most ${DETAIL_LIMITS.option} characters.`);
          break;
        }
        if (seen.has(o.en.toLowerCase())) {
          setup(`${name}: the option "${o.en}" is listed twice.`);
          break;
        }
        seen.add(o.en.toLowerCase());
      }
    }

    const rules = f.validation ?? {};
    const { minLength, maxLength, min, max, pattern } = rules;
    for (const [n, what] of [[minLength, 'Minimum length'], [maxLength, 'Maximum length']] as const) {
      if (n !== undefined && !isNonNegInt(n)) setup(`${name}: ${what} must be a whole number of 0 or more.`);
    }
    if (isNonNegInt(minLength) && isNonNegInt(maxLength) && minLength! > maxLength!) {
      setup(`${name}: the minimum length is larger than the maximum length.`);
    }
    if (isNonNegInt(maxLength) && maxLength === 0) setup(`${name}: the maximum length must be at least 1.`);
    if (f.type === 'CHECKBOX') {
      for (const [n, what] of [[min, 'Minimum choices'], [max, 'Maximum choices']] as const) {
        if (n !== undefined && !isNonNegInt(n)) setup(`${name}: ${what} must be a whole number of 0 or more.`);
      }
    } else {
      for (const [n, what] of [[min, 'Minimum value'], [max, 'Maximum value']] as const) {
        if (n !== undefined && !Number.isFinite(n)) setup(`${name}: ${what} must be a number.`);
      }
    }
    if (typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max) && min > max) {
      setup(`${name}: the minimum is larger than the maximum.`);
    }
    let regex: RegExp | null = null;
    if (pattern !== undefined) {
      if (pattern.length > DETAIL_LIMITS.pattern) setup(`${name}: the pattern can be at most ${DETAIL_LIMITS.pattern} characters.`);
      else if (!(regex = compileDetailPattern(pattern))) setup(`${name}: the pattern is not a valid regular expression.`);
      for (const m of [rules.patternMessageEn, rules.patternMessageBn]) {
        if (m && m.length > DETAIL_LIMITS.patternMessage) {
          setup(`${name}: the pattern message can be at most ${DETAIL_LIMITS.patternMessage} characters.`);
          break;
        }
      }
    }

    // ---------------------------------------------------------------- value
    const v = f.value;
    if (f.type === 'CHECKBOX') {
      const list = Array.isArray(v) ? v : [];
      if (rules.required && !list.length) value(`${name} is required — tick at least one option.`);
      const known = new Set(options.map((o) => o.en));
      const unknown = list.filter((x) => !known.has(x));
      if (unknown.length) value(`${name}: "${unknown[0]}" is no longer one of the options.`);
      if (list.length && isNonNegInt(min) && list.length < min!) value(`${name}: tick at least ${min} option(s).`);
      if (isNonNegInt(max) && list.length > max!) value(`${name}: tick at most ${max} option(s).`);
      return;
    }

    const text = typeof v === 'string' ? v : '';
    const textBn = f.valueBn ?? '';
    if (rules.required && !text) value(`${name} is required${isTextDetailType(f.type) ? ' (the English text at least)' : ''}.`);
    // Bangla-only text is allowed (as before the fields became configurable): the English site
    // then simply doesn't show the field.
    if (!text && !textBn) return;

    switch (f.type) {
      case 'SHORT_TEXT':
      case 'LONG_TEXT': {
        const cap = f.type === 'SHORT_TEXT' ? DETAIL_LIMITS.shortText : DETAIL_LIMITS.longText;
        for (const [s, lang] of [[text, 'English'], [textBn, 'Bangla']] as const) {
          if (!s) continue;
          const len = [...s].length;
          if (len > cap) value(`${name}: the ${lang} text can be at most ${cap} characters.`);
          if (isNonNegInt(maxLength) && maxLength! > 0 && len > maxLength!) value(`${name}: the ${lang} text can be at most ${maxLength} characters (it has ${len}).`);
          if (isNonNegInt(minLength) && len < minLength!) value(`${name}: the ${lang} text must be at least ${minLength} characters (it has ${len}).`);
        }
        break;
      }
      case 'NUMBER': {
        const n = Number(text);
        if (!/^-?\d+(\.\d+)?$/.test(text) || !Number.isFinite(n)) value(`${name}: enter a number.`);
        else {
          if (typeof min === 'number' && Number.isFinite(min) && n < min) value(`${name}: must be at least ${min}.`);
          if (typeof max === 'number' && Number.isFinite(max) && n > max) value(`${name}: must be at most ${max}.`);
        }
        break;
      }
      case 'EMAIL':
        if (!EMAIL_RE.test(text) || text.length > 254) value(`${name}: enter a valid email address.`);
        break;
      case 'PHONE':
        if (!PHONE_RE.test(text)) value(`${name}: enter a valid phone number (digits, spaces, + ( ) -).`);
        break;
      case 'URL':
        if (!URL_RE.test(text) || text.length > DETAIL_LIMITS.url) value(`${name}: enter a link starting with http:// or https://.`);
        break;
      case 'FILE':
        if (!FILE_RE.test(text) || text.length > DETAIL_LIMITS.url) value(`${name}: upload a file or paste an http(s):// link.`);
        break;
      case 'DATE':
        if (!validDate(text)) value(`${name}: enter a valid date.`);
        break;
      case 'SELECT':
      case 'RADIO':
        if (!options.some((o) => o.en === text)) value(`${name}: "${text}" is no longer one of the options.`);
        break;
    }

    if (regex && text && !regex.test(text)) {
      value(rules.patternMessageEn ? `${name}: ${rules.patternMessageEn}` : `${name}: the value doesn't match the required format.`);
    }
  });

  return issues;
}

/** Public reads only need what the page renders — drops the admin-only set-up keys. */
export function publicDetailFields(fields: ChallengeDetailField[]): ChallengeDetailField[] {
  return fields
    .filter(detailFieldHasValue)
    .map(({ placeholderEn: _a, placeholderBn: _b, helpTextEn: _c, helpTextBn: _d, validation: _e, ...rest }) => rest);
}
