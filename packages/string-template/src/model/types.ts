/**
 * Shared value and format vocabulary used by the parser, compiler and renderer.
 * Keeping these aliases in one place guarantees that syntax and runtime checks
 * agree on the exact set of supported names.
 */

/** A value's result from the JavaScript `typeof` operator. */
export type TypeofName =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'undefined'
  | 'object'
  | 'function';

/**
 * Runtime value kinds understood by parameter contracts.
 *
 * `null` and `Date` refine `object` because `typeof` alone cannot distinguish
 * them; contracts track the more precise kind when a placeholder formats a value.
 */
export type TemplateValueKind = TypeofName | 'null' | 'Date';

/** Built-in formatter families used by `| number`, `| date`, and `| time`. */
export type FormatKind = 'number' | 'date' | 'time';
