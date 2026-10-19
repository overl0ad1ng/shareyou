/**
 * Configuration validation for `createI18n`.
 *
 * All shape checks happen before resources are compiled so configuration
 * failures are reported as `INVALID_CONFIG` rather than as resource errors.
 */

import { I18nError } from '../errors/index.js';
import { isDictionary } from '../messages/index.js';
import type { I18nOptions } from '../types/index.js';

/**
 * Validates option shapes, time zone availability, and message resources.
 *
 * @throws {I18nError} `INVALID_CONFIG` for any invalid option.
 */
export function validateOptions(options: I18nOptions): void {
  try {
    if (!isDictionary(options) || !isDictionary(options.messages)) {
      throw new TypeError('Expected messages indexed by locale.');
    }
    if (options.strict !== undefined && typeof options.strict !== 'boolean') {
      throw new TypeError('Expected strict to be a boolean.');
    }
    if (options.onError !== undefined && typeof options.onError !== 'function') {
      throw new TypeError('Expected onError to be a function.');
    }
    if (options.formats !== undefined && !isDictionary(options.formats)) {
      throw new TypeError('Expected named formats to be an object.');
    }
    if (options.timeZone !== undefined) {
      if (typeof options.timeZone !== 'string') {
        throw new TypeError('Expected timeZone to be a string.');
      }
      // Constructing a formatter is the portable way to validate an IANA zone.
      new Intl.DateTimeFormat('en', { timeZone: options.timeZone });
    }
  } catch (cause) {
    throw new I18nError('INVALID_CONFIG', 'Invalid i18n options.', { cause });
  }
}
