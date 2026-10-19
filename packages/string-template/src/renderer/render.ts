/**
 * Renderer: walks a compiled syntax tree and produces the output string.
 *
 * The renderer holds no parsing logic. It receives the shared metadata built by
 * the compiler, validates arguments at the public boundary, and delegates all
 * language-sensitive output to the formatter layer.
 */

import {
  TemplateArgumentError,
  type BlockNode,
  type TemplateNode,
  type TemplateOptions,
  type TemplateParameter,
  type ValueNode,
} from '../model/index.js';
import {
  createFormatting,
  validateOptions,
  type Formatting,
  type FormatterCache,
} from '../formatter/index.js';
import { assertOwn, readArgument, type ArgumentNode } from './arguments.js';

/** Everything a compiled template shares between renders. */
export interface TemplateContext {
  readonly nodes: readonly TemplateNode[];
  readonly parameters: readonly TemplateParameter[];
  readonly needsLocale: boolean;
  /** Formatter cache owned by the compiled template. */
  readonly cache: FormatterCache;
}

/** Per-render state threaded through recursive branch rendering. */
interface RenderState {
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Values pre-read by `prepareValues`; empty for legacy interpolation. */
  readonly values: ReadonlyMap<ArgumentNode, unknown>;
  readonly options: TemplateOptions;
  readonly formatting: Formatting;
}

/**
 * Renders `context.nodes` with `input`.
 *
 * When the template contains blocks, every parameter referenced anywhere in
 * the tree is read once up front. This makes inactive branches part of the
 * argument contract and preserves observable getter side effects. Plain legacy
 * interpolation instead reads each occurrence in source order.
 */
export function renderTemplate(
  context: TemplateContext,
  input: unknown,
  options: TemplateOptions = {},
): string {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TemplateArgumentError('Expected template parameters to be an object.');
  }

  validateOptions(options, context.needsLocale);

  const parameters = input as Readonly<Record<string, unknown>>;
  const values = new Map<ArgumentNode, unknown>();
  const hasBlocks = context.nodes.some(isBlockNode);

  if (hasBlocks) {
    for (const parameter of context.parameters) {
      assertOwn(parameters, parameter.name);
    }
    prepareValues(context.nodes, parameters, options, values);
  }

  const state: RenderState = {
    parameters,
    values,
    options,
    formatting: createFormatting(options, context.cache),
  };

  return renderNodes(context.nodes, state);
}

/** Reads every node value, including inactive branches, in source order. */
function prepareValues(
  nodes: readonly TemplateNode[],
  input: Readonly<Record<string, unknown>>,
  options: TemplateOptions,
  values: Map<ArgumentNode, unknown>,
): void {
  for (const node of nodes) {
    if (node.kind === 'text' || node.kind === 'pound') continue;

    values.set(node, readArgument(node, input, options));

    if (node.kind !== 'value') {
      for (const branch of node.branches.values()) {
        prepareValues(branch, input, options, values);
      }
    }
  }
}

/**
 * Renders a sequence of nodes.
 *
 * `quantity` is the nearest enclosing quantity value after applying its offset;
 * it is what `{{#}}` prints. Nested select blocks pass it through unchanged.
 */
function renderNodes(
  nodes: readonly TemplateNode[],
  state: RenderState,
  quantity?: number,
): string {
  return nodes
    .map(node => {
      if (node.kind === 'text') return node.value;
      if (node.kind === 'pound') {
        return quantity === undefined ? node.literal : state.formatting.number(quantity);
      }

      assertOwn(state.parameters, node.name);

      const value = state.values.has(node)
        ? state.values.get(node)
        : readArgument(node, state.parameters, state.options);

      if (node.kind === 'value') {
        return renderValue(node, value, state.formatting);
      }

      if (node.kind === 'select') {
        const branch = node.branches.get(value as string) ?? node.branches.get('other')!;
        return renderNodes(branch, state, quantity);
      }

      // Quantity: exact selectors match the original value; category lookup
      // and {{#}} use the value remaining after the block offset.
      const remainder = (value as number) - node.offset;
      const branch =
        node.branches.get(`=${value}`) ??
        node.branches.get(state.formatting.plural(remainder, node.kind === 'ordinal')) ??
        node.branches.get('other')!;

      return renderNodes(branch, state, remainder);
    })
    .join('');
}

/** Formats one value placeholder, or coerces it with `String` when unformatted. */
function renderValue(
  node: ValueNode,
  value: unknown,
  formatting: Formatting,
): string {
  if (!node.format) return String(value);
  if (node.format.kind === 'number') {
    return formatting.number(value as number, node.format.preset);
  }
  return formatting.date(value as Date | number, node.format.kind, node.format.preset);
}

/** Narrows any node to a block (quantity or select). */
function isBlockNode(node: TemplateNode): node is BlockNode {
  return node.kind === 'plural' || node.kind === 'ordinal' || node.kind === 'select';
}
