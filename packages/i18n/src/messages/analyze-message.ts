/**
 * Message compilation.
 *
 * i18n adds resource keys and error context; templater remains the single
 * owner of grammar, parameter contracts, and rendered output.
 */

import {
  compileTemplate,
  type CompiledTemplate,
} from '@shareyou/templater';
import { I18nError, errorText } from '../errors/index.js';

/** A compiled message whose metadata is provided by templater. */
export type AnalyzedMessage = CompiledTemplate;

/**
 * Compiles one message template and rejects impossible parameter contracts.
 *
 * Conflicts such as `{{n:number}} {{n:string}}` cannot be satisfied by any
 * value, so they are treated as invalid messages at construction time rather
 * than deferred to the first render.
 */
export function analyzeMessage(
  message: string,
  key: string,
): AnalyzedMessage {
  try {
    const compiled = compileTemplate(message);
    const impossible = compiled.parameters.find(
      parameter => parameter.type === 'never',
    );

    if (impossible) {
      throw new TypeError(
        `Conflicting types for parameter ${JSON.stringify(impossible.name)}.`,
      );
    }
    return compiled;
  } catch (cause) {
    throw new I18nError(
      'INVALID_MESSAGE',
      `Invalid template ${JSON.stringify(key)}: ${errorText(cause)}`,
      { key, cause },
    );
  }
}
