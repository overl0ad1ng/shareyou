/**
 * Tokenizer: turns raw template text into a flat token stream.
 *
 * Structural nesting is intentionally left to `parser.ts`. This stage only
 * recognizes placeholders and control markers, and preserves literal text
 * byte-for-byte so unmatched braces can be emitted unchanged.
 */

import type { BlockKind, FormatKind, TypeofName, ValueNode } from '../model/index.js';
import {
  blockClosePattern,
  blockOpenPattern,
  branchLabelPattern,
  formatPattern,
  numericSelectorPattern,
  reservedPrefixPattern,
  valuePattern,
} from './grammar.js';

/** A parsed block opener awaiting its branches and matching closer. */
export interface OpenToken {
  readonly kind: 'open';
  readonly block: BlockKind;
  readonly name: string;
  readonly offset: number;
}

/** A `{{:label}}` branch marker. */
export interface BranchToken {
  readonly kind: 'branch';
  readonly label: string;
}

/** A `{{/block}}` closer. */
export interface CloseToken {
  readonly kind: 'close';
  readonly block: BlockKind;
}

/**
 * Flat token stream emitted before nested blocks are assembled.
 *
 * Text, pound, and value tokens are already valid AST nodes; the remaining
 * control tokens are consumed by the structural parser.
 */
export type Token =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'pound'; readonly literal: string }
  | ValueNode
  | OpenToken
  | BranchToken
  | CloseToken;

/**
 * Scans `source` left to right and emits text, placeholders, and control tokens.
 *
 * Malformed placeholders do not abort scanning. Instead one literal `{` is
 * emitted and scanning resumes one character later, which preserves the legacy
 * behavior where a valid placeholder nested inside extra braces is still found.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf('{{', cursor);
    if (open === -1) {
      appendText(tokens, source.slice(cursor));
      break;
    }

    appendText(tokens, source.slice(cursor, open));
    const end = source.indexOf('}}', open + 2);

    if (end === -1) {
      // A missing closer is only an error for reserved syntax; plain text keeps its braces.
      if (reservedPrefixPattern.test(source.slice(open + 2).trimStart())) {
        throw new SyntaxError('Unclosed template control or format expression.');
      }
      appendText(tokens, source.slice(open));
      break;
    }

    const body = source.slice(open + 2, end).trim();
    const literal = source.slice(open, end + 2);
    const token = parseToken(body, literal);

    if (token) {
      tokens.push(token);
      cursor = end + 2;
    } else {
      appendText(tokens, '{');
      cursor = open + 1;
    }
  }

  return tokens;
}

/** Appends text, merging with a previous text token to avoid fragmentation. */
function appendText(tokens: Token[], value: string): void {
  if (!value) return;

  const previous = tokens[tokens.length - 1];
  if (previous?.kind === 'text') {
    tokens[tokens.length - 1] = { kind: 'text', value: previous.value + value };
  } else {
    tokens.push({ kind: 'text', value });
  }
}

/**
 * Classifies one placeholder body.
 *
 * Returns `undefined` only for plain text that is not a valid value
 * placeholder; reserved control syntax always either parses or throws.
 */
function parseToken(body: string, literal: string): Token | undefined {
  if (body === '#') return { kind: 'pound', literal };
  if (body.startsWith('#')) return parseOpenToken(body);
  if (body.startsWith('/')) return parseCloseToken(body);
  if (body.startsWith(':')) return parseBranchToken(body);
  return parseValueToken(body);
}

/** Parses `#block name [offset=n]`; `select` rejects offsets. */
function parseOpenToken(body: string): OpenToken {
  const match = blockOpenPattern.exec(body);
  if (!match || (match[1] === 'select' && match[3] !== undefined)) {
    throw new SyntaxError(`Invalid template block: ${body}`);
  }

  const offset = Number(match[3] ?? 0);
  if (!Number.isSafeInteger(offset)) {
    throw new SyntaxError('Block offset must be a nonnegative safe integer.');
  }

  return {
    kind: 'open',
    block: match[1] as BlockKind,
    name: match[2]!,
    offset,
  };
}

/** Parses `/block`. */
function parseCloseToken(body: string): CloseToken {
  const match = blockClosePattern.exec(body);
  if (!match) throw new SyntaxError(`Invalid closing block: ${body}`);
  return { kind: 'close', block: match[1] as BlockKind };
}

/**
 * Parses `:label`.
 *
 * Only the label's shape is validated here; block-specific rules (quantity
 * categories, exact selectors, `select` restrictions) belong to the parser.
 */
function parseBranchToken(body: string): BranchToken {
  const label = body.slice(1).trim();
  if (!branchLabelPattern.test(label) && !numericSelectorPattern.test(label)) {
    throw new SyntaxError(`Invalid branch selector: ${body}`);
  }
  return { kind: 'branch', label };
}

/**
 * Parses a value placeholder, optionally with a `| format` operation.
 *
 * Returns `undefined` when the body is not a value placeholder, allowing the
 * caller to treat it as literal text.
 */
function parseValueToken(body: string): ValueNode | undefined {
  const pieces = body.split('|');
  const match = valuePattern.exec(pieces[0]!.trim());
  if (pieces.length === 1 && !match) return undefined;
  if (!match || pieces.length > 2) {
    throw new SyntaxError(`Invalid format expression: ${body}`);
  }

  const constraint = match[2] as TypeofName | undefined;
  const value: ValueNode = {
    kind: 'value',
    name: match[1]!,
    strict: match[3] === '!',
    ...(constraint === undefined ? {} : { constraint }),
  };

  if (pieces.length === 1) return value;

  const format = formatPattern.exec(pieces[1]!.trim());
  if (!format) throw new SyntaxError(`Invalid format expression: ${body}`);

  const preset = format[2];
  return {
    ...value,
    format: {
      kind: format[1] as FormatKind,
      ...(preset === undefined ? {} : { preset }),
    },
  };
}
