/**
 * Intl formatter factory.
 *
 * Each compiled template owns a cache so repeated renders reuse native
 * formatter instances while different locales or presets stay isolated.
 */

import type { FormatKind, TemplateOptions } from '../model/index.js';
import { normalizeFormatOptions } from './options.js';

export type Formatter =
  | Intl.NumberFormat
  | Intl.DateTimeFormat
  | Intl.PluralRules;

/** Cache shared by all renders of one compiled template. */
export type FormatterCache = Map<string, Formatter>;

/** Formatting operations exposed to the renderer. */
export interface Formatting {
  /** Formats a finite number, optionally through a named or built-in preset. */
  number(value: number, preset?: string): string;
  /** Formats a Date or timestamp as a date or time. */
  date(value: Date | number, kind: 'date' | 'time', preset?: string): string;
  /** Selects a CLDR cardinal or ordinal category for a value. */
  plural(value: number, ordinal: boolean): string;
}

/** Built-in date/time styles that may be requested as presets. */
const stylePresets = new Set(['short', 'medium', 'long', 'full']);

/** Default time formatting used when `| time` omits a preset. */
const defaultTimeOptions: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

/**
 * Creates the formatting operations bound to one render's options and cache.
 *
 * Formatters are created lazily: unknown presets fail only when the active
 * branch actually uses them.
 */
export function createFormatting(
  options: TemplateOptions,
  cache: FormatterCache,
): Formatting {
  const locale = options.locale;

  /** Returns a cached formatter for `kind` + locale + effective options. */
  function memo<T extends Formatter>(
    kind: string,
    config: object,
    create: () => T,
  ): T {
    const key = JSON.stringify([kind, locale, config]);
    let formatter = cache.get(key);

    if (!formatter) {
      formatter = create();
      cache.set(key, formatter);
    }

    // Cache keys include the formatter family, so a hit has the constructor's result type.
    return formatter as T;
  }

  /**
   * Resolves a preset name to Intl options.
   *
   * User presets take precedence over built-in date/time styles. An omitted
   * preset means "default" formatting for the respective family.
   */
  function presetOptions(
    kind: FormatKind,
    preset?: string,
  ): Intl.NumberFormatOptions | Intl.DateTimeFormatOptions {
    const named = options.formats?.[kind];

    if (preset !== undefined && named && Object.hasOwn(named, preset)) {
      return normalizeFormatOptions(kind, named[preset]);
    }
    if (preset === undefined) {
      return kind === 'time' ? defaultTimeOptions : {};
    }
    if (kind !== 'number' && stylePresets.has(preset)) {
      return { [kind === 'date' ? 'dateStyle' : 'timeStyle']: preset };
    }

    throw new RangeError(`Unknown named format ${kind}:${preset}.`);
  }

  return {
    number(value: number, preset?: string): string {
      const config = presetOptions('number', preset) as Intl.NumberFormatOptions;
      return memo('number', config, () => new Intl.NumberFormat(locale, config)).format(value);
    },

    date(value: Date | number, kind: 'date' | 'time', preset?: string): string {
      const config = {
        ...(options.timeZone === undefined ? {} : { timeZone: options.timeZone }),
        ...presetOptions(kind, preset),
      };
      return memo(kind, config, () => new Intl.DateTimeFormat(locale, config)).format(value);
    },

    plural(value: number, ordinal: boolean): string {
      const config = { type: ordinal ? 'ordinal' : 'cardinal' } as const;
      return memo('plural', config, () => new Intl.PluralRules(locale, config)).select(value);
    },
  };
}
