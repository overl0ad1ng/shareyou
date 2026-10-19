/**
 * Public i18n interface and factory options.
 *
 * The translator delegates template parsing, parameter contracts, and
 * rendering to Shareyou templater; these types describe only the i18n layer.
 */

import type { TemplateFormats } from '@shareyou/templater';
import type { I18nError } from '../errors/index.js';
import type { MessageResources } from './messages.js';

/** Configuration accepted by `createI18n`. */
export interface I18nOptions<
  Resources extends MessageResources = MessageResources,
> {
  /** Requested locale. Canonicalized when the instance is created. */
  readonly locale: string;
  /** Optional locale tried after the requested locale and its parents. */
  readonly fallbackLocale?: string;
  /** Message dictionaries indexed by locale tag. */
  readonly messages: Resources;
  /** Default IANA time zone for message and `formatDate` output. */
  readonly timeZone?: string;
  /** Named Intl presets forwarded to templater. */
  readonly formats?: TemplateFormats;
  /** Throw missing-message errors instead of returning the key. */
  readonly strict?: boolean;
  /**
   * Called before translation failures are returned or thrown.
   * Callback exceptions propagate to the caller.
   */
  readonly onError?: (error: I18nError) => void;
}

/**
 * Requires a values object only when the contract has at least one key.
 *
 * A dynamic dictionary (`string` key) stays optional because its contents are
 * unknown, while an empty contract also allows omitting the second argument.
 */
type TranslationValues<Values> = string extends keyof Values
  ? [values?: Values]
  : keyof Values extends never
    ? [values?: Values]
    : [values: Values];

/** Synchronous translator returned by `createI18n`. */
export interface I18n<Arguments> {
  /** Current canonical locale. Read-only; use `setLocale` to change it. */
  readonly locale: string;
  /** Canonicalizes and switches the locale; leaves it unchanged on failure. */
  setLocale(locale: string): void;
  /** Translates one message key with its argument contract. */
  t<Key extends keyof Arguments & string>(
    key: Key,
    ...values: TranslationValues<Arguments[NoInfer<Key>]>
  ): string;
  /** Formats a number with the current locale. */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  /** Formats a date with the current locale and default instance time zone. */
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
}
