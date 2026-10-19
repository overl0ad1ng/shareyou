/**
 * Resource dictionary analysis.
 *
 * Nested dictionaries are flattened into `parent.child.leaf` keys and every
 * string leaf is compiled once. Traversal is cycle-aware and ignores inherited
 * properties by iterating only own enumerable entries.
 */

import { I18nError } from '../errors/index.js';
import {
  analyzeMessage,
  isDictionary,
  type AnalyzedMessage,
} from '../messages/index.js';

interface DictionaryTraversal {
  readonly prefix: string;
  /** Objects on the current traversal path, used to detect cycles. */
  readonly ancestors: Set<object>;
  readonly messages: Map<string, AnalyzedMessage>;
}

/**
 * Flattens and compiles a message dictionary.
 *
 * @throws {I18nError} `INVALID_RESOURCE` for non-dictionaries, cycles, empty
 * path segments, or dotted keys; `INVALID_MESSAGE` for invalid templates.
 */
export function analyzeDictionary(input: unknown): Map<string, AnalyzedMessage> {
  const messages = new Map<string, AnalyzedMessage>();
  visitDictionary(input, { prefix: '', ancestors: new Set<object>(), messages });
  return messages;
}

function visitDictionary(
  input: unknown,
  context: DictionaryTraversal,
): void {
  const { prefix, ancestors, messages } = context;

  if (!isDictionary(input) || ancestors.has(input)) {
    throw new I18nError(
      'INVALID_RESOURCE',
      `Expected an acyclic message dictionary at ${JSON.stringify(prefix)}.`,
      { key: prefix },
    );
  }

  ancestors.add(input);

  for (const [name, value] of Object.entries(input)) {
    const key = prefix ? `${prefix}.${name}` : name;

    // Dots are reserved as path separators, so a literal dot in a segment
    // would make the flattened key ambiguous.
    if (name.length === 0 || name.includes('.')) {
      throw new I18nError(
        'INVALID_RESOURCE',
        `Message path segments must be nonempty and contain no dots: ${JSON.stringify(key)}.`,
        { key },
      );
    }

    if (typeof value === 'string') {
      messages.set(key, analyzeMessage(value, key));
    } else {
      visitDictionary(value, { ...context, prefix: key });
    }
  }

  ancestors.delete(input);
}
