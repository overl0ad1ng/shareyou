/**
 * `shareyou-i18n generate` command implementation.
 *
 * The command validates translations, renders declarations, and optionally
 * compares them without writing. Resource I/O stays in `io.ts`.
 */

import { errorText } from '../errors/index.js';
import {
  generateDeclarations,
  validateTranslation,
} from '../generator/index.js';
import { parseOptions, usage } from './args.js';
import {
  readDeclarations,
  readMessages,
  writeDeclarations,
} from './io.js';

/** Runs the CLI for the supplied arguments. */
export async function runCli(args: string[]): Promise<void> {
  const options = parseOptions(args);
  if (options === null) {
    process.stdout.write(usage);
    return;
  }

  const source = await readMessages(options.source);

  for (const { locale, file } of options.translations) {
    const translation = await readMessages(file);
    try {
      validateTranslation(source, translation);
    } catch (cause) {
      throw new Error(`${file} (${locale}): ${errorText(cause)}`, { cause });
    }
  }

  const declaration = generateDeclarations(source);

  if (options.check) {
    const previous = await readDeclarations(options.output);
    if (previous !== declaration) {
      throw new Error(
        `${options.output}: declarations are missing or stale; run generate without --check.`,
      );
    }
    return;
  }

  await writeDeclarations(options.output, declaration);
}
