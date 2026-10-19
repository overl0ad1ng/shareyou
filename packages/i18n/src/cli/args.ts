/**
 * Command-line argument parsing for `shareyou-i18n generate`.
 *
 * Parsing is strict: unknown flags, duplicate singular options, ambiguous
 * translations, and output paths that alias an input are rejected before any
 * filesystem work begins.
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { canonicalLocale } from '../resources/index.js';

export const usage = `Usage: shareyou-i18n generate --source <base.json> --out <generated.d.ts>
  --locale <language=file.json>  Validate another locale (repeatable)
  --check                       Check declarations without writing
  --help                        Show this help
`;

/** Parsed `generate` command configuration. */
export interface GenerateOptions {
  readonly source: string;
  readonly output: string;
  readonly translations: readonly { locale: string; file: string }[];
  readonly check: boolean;
}

/**
 * Parses `process.argv.slice(2)`.
 *
 * Returns `null` when help was requested; all other invalid input throws so the
 * executable can print the message and exit with status 1.
 */
export function parseOptions(args: string[]): GenerateOptions | null {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      source: { type: 'string', multiple: true },
      out: { type: 'string', multiple: true },
      locale: { type: 'string', multiple: true },
      check: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) return null;

  if (
    positionals.length !== 1 ||
    positionals[0] !== 'generate' ||
    values.source?.length !== 1 ||
    values.out?.length !== 1
  ) {
    throw new Error(usage);
  }

  const source = values.source[0]!;
  const output = values.out[0]!;
  if (!source || !output) {
    throw new Error('Source and output paths must be nonempty.');
  }

  const locales = new Set<string>();
  const translations = (values.locale ?? []).map(entry => {
    const translation = parseTranslationEntry(entry);
    if (locales.has(translation.locale)) {
      throw new Error(`Duplicate locale ${translation.locale}.`);
    }
    locales.add(translation.locale);
    return translation;
  });

  const outputPath = resolve(output);
  const samePath = (file: string) =>
    process.platform === 'win32'
      ? resolve(file).toLowerCase() === outputPath.toLowerCase()
      : resolve(file) === outputPath;

  if ([source, ...translations.map(translation => translation.file)].some(samePath)) {
    throw new Error('Output must not overwrite an input resource.');
  }

  return {
    source,
    output,
    translations,
    check: values.check ?? false,
  };
}

/** Parses one `--locale tag=file.json` value. */
function parseTranslationEntry(
  entry: string,
): { locale: string; file: string } {
  const separator = entry.indexOf('=');
  if (separator <= 0 || separator === entry.length - 1) {
    throw new Error(
      `Expected --locale language=file.json, received ${JSON.stringify(entry)}.`,
    );
  }

  return {
    locale: canonicalLocale(entry.slice(0, separator)),
    file: entry.slice(separator + 1),
  };
}
