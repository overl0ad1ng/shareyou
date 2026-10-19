/**
 * Locale canonicalization and lookup order.
 *
 * Lookup is deterministic and independent of environment defaults: the
 * requested locale is tried first, then its parents, then the fallback locale
 * and its parents, with duplicates removed.
 */

import { I18nError } from '../errors/index.js';

/**
 * Canonicalizes one BCP 47 language tag.
 *
 * Invalid or empty tags are configuration errors. Canonical casing is what
 * makes `zh-cn` and `zh-CN` resolve to the same dictionary.
 */
export function canonicalLocale(locale: string): string {
  try {
    if (typeof locale !== 'string' || locale.length === 0) {
      throw new RangeError('Expected a nonempty language tag.');
    }
    const canonical = Intl.getCanonicalLocales(locale)[0];
    if (!canonical) throw new RangeError('Expected a language tag.');
    return canonical;
  } catch (cause) {
    throw new I18nError('INVALID_CONFIG', `Invalid locale ${JSON.stringify(locale)}.`, {
      cause,
    });
  }
}

/**
 * Builds the ordered, deduplicated list of locales to inspect.
 *
 * Parents are only appended for an explicit fallback, never inferred from the
 * environment, so server output does not depend on system language settings.
 */
export function lookupLocales(
  locale: string,
  fallbackLocale?: string,
): string[] {
  return [
    ...new Set([
      ...localeParents(locale),
      ...(fallbackLocale ? localeParents(fallbackLocale) : []),
    ]),
  ];
}

/**
 * Returns a tag followed by each progressively shorter parent.
 *
 * Unicode extensions are removed as one unit (`en-US-u-hc-h23` becomes
 * `en-US`, then `en`); truncating segments individually would produce invalid
 * intermediate tags.
 */
function localeParents(locale: string): string[] {
  const base = new Intl.Locale(locale).baseName;
  const parents = locale === base ? [] : [locale];
  const segments = base.split('-');

  while (segments.length > 0) {
    parents.push(segments.join('-'));
    segments.pop();
  }

  return parents;
}
