import type { TemplateValueKind } from './types.js';

/**
 * Normalized runtime contract for one template parameter.
 *
 * `types` records every value kind accepted by every occurrence of the name,
 * while `type` renders that intersection as a TypeScript-style expression
 * (`unknown` when unconstrained, `never` when the constraints conflict).
 */
export interface TemplateParameter {
  readonly name: string;
  readonly types: readonly TemplateValueKind[];
  readonly type: string;
}
