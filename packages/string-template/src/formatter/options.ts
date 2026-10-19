/**
 * Intl option handling: validation, normalization, and snapshotting.
 *
 * Native Intl constructors read effective option values, including inherited
 * and non-enumerable properties. These helpers do the same so cache keys and
 * formatter construction observe identical configuration.
 */

import type { FormatKind, TemplateFormats, TemplateOptions } from '../model/index.js';

type OptionKind = 'string' | 'number' | 'boolean' | 'grouping';

const commonOptions = {
  localeMatcher: 'string',
  numberingSystem: 'string',
} as const satisfies Readonly<Record<string, OptionKind>>;

/** Supported `Intl.NumberFormat` options and how their values are coerced. */
const numberOptions: Readonly<Record<string, OptionKind>> = {
  ...commonOptions,
  style: 'string',
  currency: 'string',
  currencyDisplay: 'string',
  currencySign: 'string',
  unit: 'string',
  unitDisplay: 'string',
  notation: 'string',
  compactDisplay: 'string',
  useGrouping: 'grouping',
  signDisplay: 'string',
  minimumIntegerDigits: 'number',
  minimumFractionDigits: 'number',
  maximumFractionDigits: 'number',
  minimumSignificantDigits: 'number',
  maximumSignificantDigits: 'number',
  roundingPriority: 'string',
  roundingIncrement: 'number',
  roundingMode: 'string',
  trailingZeroDisplay: 'string',
};

/** Supported `Intl.DateTimeFormat` options and how their values are coerced. */
const dateOptions: Readonly<Record<string, OptionKind>> = {
  ...commonOptions,
  calendar: 'string',
  timeZone: 'string',
  hour12: 'boolean',
  hourCycle: 'string',
  formatMatcher: 'string',
  weekday: 'string',
  era: 'string',
  year: 'string',
  month: 'string',
  day: 'string',
  dayPeriod: 'string',
  hour: 'string',
  minute: 'string',
  second: 'string',
  fractionalSecondDigits: 'number',
  timeZoneName: 'string',
  dateStyle: 'string',
  timeStyle: 'string',
};

/**
 * Validates rendering options before any parameter is read.
 *
 * Validation is deliberately eager so configuration errors surface even when
 * no placeholder happens to use the invalid value.
 */
export function validateOptions(
  options: TemplateOptions,
  needsLocale: boolean,
): void {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError('Expected template options to be an object.');
  }
  if (needsLocale && options.locale === undefined) {
    throw new TypeError('This template requires an explicit locale.');
  }
  if (options.locale !== undefined) {
    if (typeof options.locale !== 'string' || options.locale.length === 0) {
      throw new TypeError('Expected locale to be a nonempty string.');
    }
    // Throws RangeError for malformed or structurally invalid tags.
    Intl.getCanonicalLocales(options.locale);
  }
  if (
    options.typeMismatch !== undefined &&
    options.typeMismatch !== 'warn' &&
    options.typeMismatch !== 'throw'
  ) {
    throw new TypeError('Invalid typeMismatch policy.');
  }
  if (options.timeZone !== undefined) {
    if (typeof options.timeZone !== 'string') {
      throw new TypeError('Expected timeZone to be a string.');
    }
    // Constructing a formatter is the portable way to validate an IANA zone.
    new Intl.DateTimeFormat('en', { timeZone: options.timeZone });
  }
  if (
    options.formats !== undefined &&
    (typeof options.formats !== 'object' ||
      options.formats === null ||
      Array.isArray(options.formats))
  ) {
    throw new TypeError('Expected named template formats to be an object.');
  }
}

/**
 * Copies supported Intl options from `input` after coercing each value the way
 * the native constructor would.
 *
 * Only known keys are copied, so unrelated properties do not affect formatter
 * identity or behavior.
 */
export function normalizeFormatOptions(
  kind: FormatKind,
  input: unknown,
): Intl.NumberFormatOptions | Intl.DateTimeFormatOptions {
  if ((typeof input !== 'object' && typeof input !== 'function') || input === null) {
    throw new TypeError('Expected Intl format options to be an object.');
  }

  const source = input as Record<string, unknown>;
  const normalized: Record<string, unknown> = Object.create(null);
  const supported = kind === 'number' ? numberOptions : dateOptions;

  for (const [key, valueKind] of Object.entries(supported)) {
    const value = source[key];
    if (value !== undefined) {
      normalized[key] = normalizeValue(value, valueKind);
    }
  }

  return normalized;
}

/** Coerces one Intl option value using the semantics of its option family. */
function normalizeValue(value: unknown, kind: OptionKind): unknown {
  if (kind === 'boolean') return Boolean(value);
  if (kind === 'number') return +(value as number);
  // `useGrouping` historically also accepts the string values "true"/"false"/"auto".
  if (kind === 'grouping' && typeof value === 'boolean') return value;
  if (typeof value === 'symbol') {
    throw new TypeError('Cannot convert a Symbol to an Intl option string.');
  }
  return String(value);
}

/**
 * Snapshots effective preset values for adapters that own long-lived locale
 * state.
 *
 * The returned object is deeply frozen and contains only supported options,
 * so later mutations of the caller's dictionaries cannot change formatting.
 */
export function snapshotTemplateFormats(formats: TemplateFormats): TemplateFormats {
  if (typeof formats !== 'object' || formats === null || Array.isArray(formats)) {
    throw new TypeError('Expected named template formats to be an object.');
  }

  const snapshot: Partial<
    Record<
      FormatKind,
      Record<string, Intl.NumberFormatOptions | Intl.DateTimeFormatOptions>
    >
  > = Object.create(null);

  for (const kind of ['number', 'date', 'time'] as const) {
    const group = formats[kind];
    if (group === undefined) continue;
    if (typeof group !== 'object' || group === null || Array.isArray(group)) {
      throw new TypeError(`Expected ${kind} formats to be a dictionary.`);
    }

    const presets: Record<
      string,
      Intl.NumberFormatOptions | Intl.DateTimeFormatOptions
    > = Object.create(null);

    for (const name of Object.keys(group)) {
      presets[name] = Object.freeze(normalizeFormatOptions(kind, group[name]));
    }

    snapshot[kind] = Object.freeze(presets);
  }

  return Object.freeze(snapshot) as TemplateFormats;
}
