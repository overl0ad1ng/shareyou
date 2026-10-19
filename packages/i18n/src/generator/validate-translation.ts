/**
 * Translation compatibility checks.
 *
 * The base dictionary defines the key and argument contract. Translations may
 * omit keys (runtime fallback handles them), but every translated key must
 * exist in the base dictionary with the same contract.
 */

import type { AnalyzedMessage } from '../messages/index.js';
import { contractSignature } from './contract.js';

/**
 * Validates one translation against the base dictionary.
 *
 * @throws {TypeError} For unknown keys or changed argument contracts.
 */
export function validateTranslation(
  source: ReadonlyMap<string, AnalyzedMessage>,
  translation: ReadonlyMap<string, AnalyzedMessage>,
): void {
  for (const [key, message] of translation) {
    const original = source.get(key);
    if (!original) {
      throw new TypeError(`Unknown translation key ${JSON.stringify(key)}.`);
    }

    const expected = contractSignature(original.parameters);
    const actual = contractSignature(message.parameters);

    if (expected !== actual) {
      throw new TypeError(
        `Argument contract differs for message ${JSON.stringify(key)}: expected ${expected}, received ${actual}.`,
      );
    }
  }
}
