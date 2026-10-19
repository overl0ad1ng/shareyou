/**
 * Structural parser: assembles flat tokens into a nested syntax tree.
 *
 * The tokenizer already classified each placeholder; this stage enforces
 * block structure, branch ordering, duplicate labels, and matching closers.
 */

import type { BlockKind, BlockNode, TemplateNode } from '../model/index.js';
import { categoryLabels, numericSelectorPattern } from './grammar.js';
import { tokenize, type BranchToken, type OpenToken, type Token } from './tokenizer.js';

interface Cursor {
  readonly tokens: readonly Token[];
  index: number;
}

/**
 * Parses a template into immutable syntax nodes.
 *
 * @param source - Template text. Non-strings fail fast at the public boundary.
 * @throws {SyntaxError} For malformed or unbalanced control syntax.
 */
export function parseTemplate(source: string): readonly TemplateNode[] {
  if (typeof source !== 'string') {
    throw new TypeError('Expected template to be a string.');
  }
  return readSequence({ tokens: tokenize(source), index: 0 }, false);
}

/**
 * Reads nodes until the end of input or, inside a block, until a branch or
 * closing marker. The cursor is shared so nested blocks consume their own tail.
 */
function readSequence(cursor: Cursor, inBlock: boolean): TemplateNode[] {
  const nodes: TemplateNode[] = [];

  while (cursor.index < cursor.tokens.length) {
    const token = cursor.tokens[cursor.index]!;

    if (token.kind === 'branch' || token.kind === 'close') {
      if (!inBlock) throw new SyntaxError('Unexpected branch or closing block.');
      break;
    }

    cursor.index++;
    nodes.push(token.kind === 'open' ? readBlock(token, cursor) : token);
  }

  return nodes;
}

/**
 * Reads a block body: an optional whitespace-only prefix, one or more branches,
 * and the matching closer.
 */
function readBlock(open: OpenToken, cursor: Cursor): BlockNode {
  const prefix = readSequence(cursor, true);
  if (prefix.some(node => node.kind !== 'text' || node.value.trim() !== '')) {
    throw new SyntaxError('Only whitespace may precede the first branch.');
  }

  const branches = new Map<string, readonly TemplateNode[]>();

  while (cursor.tokens[cursor.index]?.kind === 'branch') {
    const branch = cursor.tokens[cursor.index++] as BranchToken;
    const label = normalizeBranch(branch.label, open.block);

    if (branches.has(label)) {
      throw new SyntaxError(`Duplicate branch: ${label}`);
    }
    branches.set(label, readSequence(cursor, true));
  }

  const close = cursor.tokens[cursor.index++];
  if (close?.kind !== 'close' || close.block !== open.block) {
    throw new SyntaxError(`Missing matching /${open.block} block.`);
  }
  if (!branches.has('other')) {
    throw new SyntaxError('Every template block requires an other branch.');
  }

  return {
    kind: open.block,
    name: open.name,
    offset: open.offset,
    branches,
  };
}

/**
 * Validates a branch label for the enclosing block and normalizes exact
 * selectors (for example `=+1` becomes `=1`).
 */
function normalizeBranch(label: string, block: BlockKind): string {
  if (block === 'select') {
    if (label.startsWith('=')) {
      throw new SyntaxError('Select blocks require named branches.');
    }
    return label;
  }

  if (categoryLabels.has(label)) return label;

  if (
    numericSelectorPattern.test(label) &&
    Number.isFinite(Number(label.slice(1)))
  ) {
    return `=${Number(label.slice(1))}`;
  }

  throw new SyntaxError(`Invalid quantity branch: ${label}`);
}
