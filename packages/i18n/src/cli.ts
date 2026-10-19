#!/usr/bin/env node

/**
 * Executable entry point for `shareyou-i18n`.
 *
 * Argument parsing and command behavior live in `cli/`; this file only wires
 * process I/O and exit status.
 */

import { runCli } from './cli/main.js';
import { errorText } from './errors/index.js';

runCli(process.argv.slice(2)).catch(error => {
  process.stderr.write(`${errorText(error)}\n`);
  process.exitCode = 1;
});
