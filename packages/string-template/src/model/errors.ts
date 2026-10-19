/**
 * Public error types.
 *
 * Both classes keep a native `Error.name` so existing `instanceof` checks and
 * error handling continue to behave like the standard errors they extend.
 */

/** Invalid parameters object, parameter value, or inactive-branch contract. */
export class TemplateArgumentError extends TypeError {}

/** A required parameter is absent from the supplied object's own properties. */
export class MissingTemplateParameterError extends ReferenceError {}
