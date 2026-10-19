/**
 * Grammar patterns shared by the tokenizer and the structural parser.
 *
 * Patterns are intentionally defined once so token-level validation and
 * block-level composition cannot drift apart.
 */

/** Placeholder value: `name`, `name:type`, or `name:type!`. */
export const valuePattern =
  /^([A-Za-z_$][\w$]*)\s*(?::\s*(string|number|boolean|bigint|symbol|undefined|object|function)\s*(!)?)?$/;

/** CLDR quantity categories accepted as branch labels. */
export const categoryLabels: ReadonlySet<string> = new Set([
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
]);

/** Exact quantity selector such as `=0`, `=+1`, or `=.5`. */
export const numericSelectorPattern = /^=[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** Select branch labels: ASCII identifiers, optionally containing hyphens. */
export const branchLabelPattern = /^[A-Za-z_$][\w$-]*$/;

/** Block opening header: `#plural name`, optionally followed by `offset=n`. */
export const blockOpenPattern =
  /^#(plural|ordinal|select)\s+([A-Za-z_$][\w$]*)(?:\s+offset\s*=\s*(\d+))?$/;

/** Block closing marker: `/plural`, `/ordinal`, or `/select`. */
export const blockClosePattern = /^\/\s*(plural|ordinal|select)$/;

/** Format operation: `number`, `date`, or `time`, optionally followed by `:preset`. */
export const formatPattern =
  /^(number|date|time)\s*(?::\s*([A-Za-z_$][\w$-]*))?$/;

/**
 * Detects an unterminated placeholder that begins like a control or format
 * expression. Those must fail loudly; any other unmatched `{{` stays literal.
 */
export const reservedPrefixPattern = /^(?:[#/:]|[^{}]*\|)/;
