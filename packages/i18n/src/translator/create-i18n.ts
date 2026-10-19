/**
 * Translator factory.
 *
 * i18n owns locale selection, resource lookup, fallback order, and error
 * context. Template parsing and rendering are delegated to templater.
 */

import {
  MissingTemplateParameterError,
  TemplateArgumentError,
  snapshotTemplateFormats,
  type TemplateOptions,
} from '@shareyou/templater';
import { I18nError, type I18nErrorCode } from '../errors/index.js';
import { canonicalLocale, lookupLocales } from '../resources/index.js';
import type {
  I18n,
  I18nOptions,
  InferredMessageArguments,
  MessageResources,
  MessageValue,
} from '../types/index.js';
import {
  compileResources,
  type CompiledMessage,
} from './compile-resources.js';
import { validateOptions } from './validate-options.js';

/**
 * Creates an independent synchronous translator.
 *
 * @param options - Locale, resources, fallback, formatting, and error policy.
 * @throws {I18nError} `INVALID_CONFIG` for invalid options; resource and
 * message errors surface during resource compilation.
 */
export function createI18n<
  Arguments extends { [Key in keyof Arguments]: Readonly<Record<string, MessageValue>> } = never,
  const Resources extends MessageResources = MessageResources,
>(
  options: I18nOptions<Resources>,
): I18n<[Arguments] extends [never] ? InferredMessageArguments<Resources> : Arguments> {
  validateOptions(options);

  let locale = canonicalLocale(options.locale);
  const fallback = options.fallbackLocale === undefined
    ? undefined
    : canonicalLocale(options.fallbackLocale);
  const { timeZone, strict, onError } = options;
  const formats = snapshotFormats(options.formats);

  // i18n messages are application content, so constraint mismatches always
  // throw instead of only warning.
  const resources = compileResources(options.messages, {
    typeMismatch: 'throw',
    ...(timeZone === undefined ? {} : { timeZone }),
    ...(formats === undefined ? {} : { formats }),
  });

  if (fallback !== undefined && !resources.has(fallback)) {
    throw new I18nError(
      'INVALID_CONFIG',
      `Fallback locale ${JSON.stringify(fallback)} has no registered dictionary.`,
    );
  }

  /**
   * Reports a translation failure, then throws it.
   *
   * The locale is read at call time so `setLocale` is reflected immediately.
   */
  function fail(
    code: I18nErrorCode,
    key: string | undefined,
    attemptedLocales: string[],
    cause: unknown,
  ): never {
    const error = new I18nError(
      code,
      `Cannot translate ${JSON.stringify(key)} for ${locale}.`,
      {
        ...(key === undefined ? {} : { key }),
        locale,
        attemptedLocales,
        cause,
      },
    );

    onError?.(error);
    throw error;
  }

  /** Looks up a key and renders the first matching dictionary entry. */
  function translate(key: unknown, input?: unknown): string {
    if (typeof key !== 'string') {
      return fail(
        'INVALID_ARGUMENT',
        undefined,
        [],
        new TypeError('Expected a translation key to be a string.'),
      );
    }

    const attemptedLocales: string[] = [];
    let message: CompiledMessage | undefined;

    for (const candidate of lookupLocales(locale, fallback)) {
      attemptedLocales.push(candidate);
      message = resources.get(candidate)?.get(key);
      if (message !== undefined) break;
    }

    if (message === undefined) {
      const error = new I18nError(
        'MISSING_MESSAGE',
        `Missing message ${JSON.stringify(key)} for ${locale}.`,
        { key, locale, attemptedLocales },
      );

      onError?.(error);
      if (strict) throw error;
      return key;
    }

    try {
      // Preserve invalid JavaScript inputs for templater's own boundary validation.
      const parameters = (input === undefined ? {} : input) as Readonly<
        Record<string, unknown>
      >;
      return message.template.render(parameters, message.options);
    } catch (cause) {
      const argumentFailure =
        cause instanceof TemplateArgumentError ||
        cause instanceof MissingTemplateParameterError;

      return fail(
        argumentFailure ? 'INVALID_ARGUMENT' : 'FORMAT_ERROR',
        key,
        attemptedLocales,
        cause,
      );
    }
  }

  return {
    get locale() {
      return locale;
    },
    setLocale(nextLocale) {
      locale = canonicalLocale(nextLocale);
    },
    t: translate,
    formatNumber(value, formatOptions) {
      return new Intl.NumberFormat(locale, formatOptions).format(value);
    },
    formatDate(value, formatOptions) {
      return new Intl.DateTimeFormat(locale, {
        ...(timeZone === undefined ? {} : { timeZone }),
        ...formatOptions,
      }).format(value);
    },
  };
}

/**
 * Snapshots named formats so later edits to the caller's dictionaries do not
 * change an existing instance.
 */
function snapshotFormats(
  formats: TemplateOptions['formats'],
): TemplateOptions['formats'] {
  if (formats === undefined) return undefined;

  try {
    return snapshotTemplateFormats(formats);
  } catch (cause) {
    throw new I18nError('INVALID_CONFIG', 'Invalid named formats.', { cause });
  }
}
