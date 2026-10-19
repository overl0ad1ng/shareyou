/**
 * Structural guard for nested message/option objects.
 *
 * Arrays and `Date` instances are objects too, but neither is a valid
 * dictionary in this API, so they are rejected explicitly.
 */
export function isDictionary(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}
