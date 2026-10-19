/**
 * Structured i18n failure used at every public boundary.
 *
 * The class keeps the contextual fields separate from the message so callers
 * can branch on `code` and report locale/lookup details without parsing text.
 */

export type I18nErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_RESOURCE'
  | 'INVALID_MESSAGE'
  | 'MISSING_MESSAGE'
  | 'INVALID_ARGUMENT'
  | 'FORMAT_ERROR';

export interface I18nErrorDetails {
  /** Message key associated with the failure, when one exists. */
  readonly key?: string;
  /** Locale active when the failure occurred. */
  readonly locale?: string;
  /** Locale candidates examined before the failure was reported. */
  readonly attemptedLocales?: readonly string[];
  /** Original error, preserved for diagnostics. */
  readonly cause?: unknown;
}

/** A contextual configuration, lookup, or formatting failure. */
export class I18nError extends Error {
  readonly code: I18nErrorCode;
  readonly key: string | undefined;
  readonly locale: string | undefined;
  /** Frozen snapshot so later mutation cannot rewrite the diagnostic. */
  readonly attemptedLocales: readonly string[];

  constructor(
    code: I18nErrorCode,
    message: string,
    details: I18nErrorDetails = {},
  ) {
    super(message, { cause: details.cause });
    this.name = 'I18nError';
    this.code = code;
    this.key = details.key;
    this.locale = details.locale;
    this.attemptedLocales = Object.freeze([...(details.attemptedLocales ?? [])]);
  }
}
