/**
 * Resource compilation for the translator.
 *
 * Each locale dictionary is flattened, compiled, and paired with the same
 * templater options. Rendering later selects one compiled map by locale.
 */

import type {
  CompiledTemplate,
  TemplateOptions,
} from '@shareyou/templater';
import { I18nError } from '../errors/index.js';
import type { AnalyzedMessage } from '../messages/index.js';
import { analyzeDictionary, canonicalLocale } from '../resources/index.js';
import type { MessageResources } from '../types/index.js';

/** One compiled message together with the options used to render it. */
export interface CompiledMessage {
  readonly template: CompiledTemplate;
  readonly options: TemplateOptions;
}

/**
 * Compiles every dictionary and indexes messages by canonical locale.
 *
 * @throws {I18nError} `INVALID_CONFIG` for duplicate canonical tags;
 * `INVALID_RESOURCE`/`INVALID_MESSAGE` (with locale context) otherwise.
 */
export function compileResources(
  resources: MessageResources,
  options: TemplateOptions,
): Map<string, Map<string, CompiledMessage>> {
  const compiled = new Map<string, Map<string, CompiledMessage>>();

  for (const [tag, dictionary] of Object.entries(resources)) {
    const locale = canonicalLocale(tag);

    if (compiled.has(locale)) {
      throw new I18nError(
        'INVALID_CONFIG',
        `Duplicate canonical locale ${JSON.stringify(locale)}.`,
      );
    }

    const messages = new Map<string, CompiledMessage>();
    const renderOptions = { ...options, locale };

    for (const [key, template] of analyzeDictionaryWithContext(dictionary, locale)) {
      messages.set(key, { template, options: renderOptions });
    }

    compiled.set(locale, messages);
  }

  return compiled;
}

/**
 * Adds locale context to resource/message failures raised while analyzing one
 * dictionary.
 */
function analyzeDictionaryWithContext(
  dictionary: unknown,
  locale: string,
): Map<string, AnalyzedMessage> {
  try {
    return analyzeDictionary(dictionary);
  } catch (cause) {
    if (!(cause instanceof I18nError)) throw cause;

    throw new I18nError(cause.code, `${locale}: ${cause.message}`, {
      locale,
      ...(cause.key === undefined ? {} : { key: cause.key }),
      cause: cause.cause ?? cause,
    });
  }
}
