/**
 * CLI filesystem operations.
 *
 * Reads are wrapped with file context. Writes are atomic: content goes to a
 * unique temporary file in the destination directory and is renamed over the
 * target only after the write succeeds.
 */

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { errorText } from '../errors/index.js';
import type { AnalyzedMessage } from '../messages/index.js';
import { analyzeDictionary } from '../resources/index.js';

/**
 * Reads and compiles one JSON message file.
 *
 * A UTF-8 BOM is stripped before parsing. Failures include the source path and
 * preserve the original cause.
 */
export async function readMessages(
  file: string,
): Promise<Map<string, AnalyzedMessage>> {
  try {
    const contents = await readFile(file, 'utf8');
    return analyzeDictionary(JSON.parse(contents.replace(/^\uFEFF/, '')));
  } catch (cause) {
    throw new Error(`${file}: ${errorText(cause)}`, { cause });
  }
}

/** Reads existing declarations, or returns `undefined` when absent. */
export async function readDeclarations(
  file: string,
): Promise<string | undefined> {
  return readFile(file, 'utf8').catch(() => undefined);
}

/** Writes declarations atomically, creating parent directories as needed. */
export async function writeDeclarations(
  file: string,
  contents: string,
): Promise<void> {
  const output = resolve(file);
  await mkdir(dirname(output), { recursive: true });

  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    // `wx` also guarantees the temporary path cannot overwrite an existing file.
    await writeFile(temporary, contents, { flag: 'wx' });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}
