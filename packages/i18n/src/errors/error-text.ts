/** Converts an unknown thrown value into a readable one-line description. */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
