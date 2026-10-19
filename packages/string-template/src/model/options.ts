/**
 * Public rendering options.
 *
 * Options are deliberately plain data so callers can construct them in any
 * environment; normalization and validation happen in the formatter layer.
 */

/** Named Intl option presets grouped by formatter family. */
export interface TemplateFormats {
  readonly number?: Readonly<Record<string, Intl.NumberFormatOptions>>;
  readonly date?: Readonly<Record<string, Intl.DateTimeFormatOptions>>;
  readonly time?: Readonly<Record<string, Intl.DateTimeFormatOptions>>;
}

/** Configuration accepted by `templater` and `CompiledTemplate.render`. */
export interface TemplateOptions {
  /** Explicit BCP 47 locale. Required when the template uses language rules. */
  readonly locale?: string;
  /** IANA time zone used by date/time formatting. */
  readonly timeZone?: string;
  /** Named Intl presets referenced by `:preset` in a format expression. */
  readonly formats?: TemplateFormats;
  /** Whether ordinary constraint mismatches warn or throw. `!` always throws. */
  readonly typeMismatch?: 'warn' | 'throw';
}
