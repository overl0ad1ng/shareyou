/**
 * Public package entry point.
 *
 * Runtime exports are limited to the translator factory and error type. Type
 * exports describe options, resources, and the inferred/generated contracts.
 */

import { createI18n } from './translator/create-i18n.js';

export { createI18n } from './translator/index.js';
export {
  I18nError,
  type I18nErrorCode,
  type I18nErrorDetails,
} from './errors/index.js';
export type {
  I18n,
  I18nOptions,
  InferredMessageArguments,
  MessageDictionary,
  MessageResources,
  MessageValue,
} from './types/index.js';
