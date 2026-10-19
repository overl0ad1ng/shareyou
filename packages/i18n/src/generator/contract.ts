/**
 * Deterministic signature helpers shared by validation and declaration output.
 *
 * Sorting by name makes the signatures independent of branch traversal order,
 * so equivalent messages always compare equal and generated output is stable.
 */

import type { TemplateParameter } from '@shareyou/templater';

/** Builds the canonical TypeScript property list for one message contract. */
export function contractSignature(
  parameters: readonly TemplateParameter[],
): string {
  return [...parameters]
    .sort((a, b) => compareText(a.name, b.name))
    .map(parameter => `readonly ${JSON.stringify(parameter.name)}: ${parameter.type};`)
    .join(' ');
}

/** Locale-independent string comparison for deterministic ordering. */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
