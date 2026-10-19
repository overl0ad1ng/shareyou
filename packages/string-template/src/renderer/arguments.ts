/**
 * Runtime argument validation.
 *
 * These helpers keep all "read and check a parameter" behavior in one place so
 * legacy interpolation and prepared block contracts apply identical rules.
 */

import {
  MissingTemplateParameterError,
  TemplateArgumentError,
  type BlockNode,
  type TemplateOptions,
  type ValueNode,
} from '../model/index.js';

/** Nodes that consume a named parameter. */
export type ArgumentNode = ValueNode | BlockNode;

/**
 * Requires `name` to be an own property.
 *
 * Prototype values are intentionally ignored so templates cannot accidentally
 * render inherited members such as `toString`.
 */
export function assertOwn(
  input: Readonly<Record<string, unknown>>,
  name: string,
): void {
  if (!Object.hasOwn(input, name)) {
    throw new MissingTemplateParameterError(`Missing template parameter \`${name}\`.`);
  }
}

/**
 * Reads and validates the value for one value or block node.
 *
 * Block controls must be a string (`select`) or a finite number (quantity).
 * Value constraints warn or throw according to the `!` marker and the
 * `typeMismatch` option. Format operations additionally require a compatible
 * input type before Intl sees the value.
 */
export function readArgument(
  node: ArgumentNode,
  input: Readonly<Record<string, unknown>>,
  options: TemplateOptions,
): unknown {
  assertOwn(input, node.name);
  const value = input[node.name];

  if (node.kind !== 'value') {
    if (node.kind === 'select') {
      if (typeof value !== 'string') {
        throw new TemplateArgumentError(
          `Expected select parameter \`${node.name}\` to be a string.`,
        );
      }
    } else {
      assertFiniteNumber(node.name, value);
    }
    return value;
  }

  if (node.constraint && typeof value !== node.constraint) {
    const message =
      `Expected template parameter \`${node.name}\` to be of type ` +
      `\`${node.constraint}\`, but received \`${typeof value}\`.`;

    if (node.strict || options.typeMismatch === 'throw') {
      throw new TemplateArgumentError(message);
    }
    console.warn(message);
  }

  if (node.format?.kind === 'number') {
    assertFiniteNumber(node.name, value);
  } else if (node.format) {
    assertDate(node.name, value);
  }

  return value;
}

/** Asserts that a quantity control or numeric format input is finite. */
export function assertFiniteNumber(
  name: string,
  value: unknown,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TemplateArgumentError(
      `Expected template parameter \`${name}\` to be a finite number.`,
    );
  }
}

/** Asserts that a date/time input is a valid Date or timestamp. */
export function assertDate(
  name: string,
  value: unknown,
): asserts value is Date | number {
  const timestamp =
    value instanceof Date ? value.getTime() : typeof value === 'number' ? value : NaN;

  if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) {
    throw new TemplateArgumentError(
      `Expected template parameter \`${name}\` to be a valid Date or timestamp.`,
    );
  }
}
