/** Immutable syntax tree nodes produced by the parser and consumed by the renderer. */

import type { FormatKind, TypeofName } from './types.js';

/** A `{{name}}`, `{{name:type}}`, or `{{name:type | format}}` placeholder. */
export interface ValueNode {
  readonly kind: 'value';
  readonly name: string;
  /** Optional `:type` constraint checked at runtime. */
  readonly constraint?: TypeofName;
  /** `!` strict marker: a mismatch throws instead of warning. */
  readonly strict: boolean;
  /** Optional `| number`, `| date`, or `| time` operation. */
  readonly format?: {
    readonly kind: FormatKind;
    readonly preset?: string;
  };
}

/** Block kind shared by quantity (`plural`/`ordinal`) and `select` controls. */
export type BlockKind = 'plural' | 'ordinal' | 'select';

/** A `{{#plural ...}}`, `{{#ordinal ...}}`, or `{{#select ...}}` block. */
export interface BlockNode {
  readonly kind: BlockKind;
  /** Name of the parameter that selects the active branch. */
  readonly name: string;
  /** Quantity offset applied to `{{#}}`; always zero for `select`. */
  readonly offset: number;
  /** Branch labels mapped to their parsed contents. Always contains `other`. */
  readonly branches: ReadonlyMap<string, readonly TemplateNode[]>;
}

/**
 * Any node that can appear in a parsed template.
 *
 * `text` and `pound` carry literal spelling so the renderer can reproduce
 * source text verbatim when a `{{#}}` marker has no enclosing quantity block.
 */
export type TemplateNode =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'pound'; readonly literal: string }
  | ValueNode
  | BlockNode;
