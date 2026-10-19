/**
 * Parameter contract collection.
 *
 * The parser records syntax only; this module derives the normalized contract
 * that describes which parameters exist and which value kinds every occurrence
 * accepts together. The same nodes therefore drive rendering and metadata.
 */

import type {
  TemplateNode,
  TemplateParameter,
  TemplateValueKind,
  TypeofName,
} from '../model/index.js';

/** Every kind a placeholder can accept when no constraint narrows it. */
const allKinds: readonly TemplateValueKind[] = [
  'string',
  'number',
  'boolean',
  'bigint',
  'symbol',
  'undefined',
  'object',
  'null',
  'Date',
  'function',
];

/**
 * Collects one frozen contract per parameter, in first-appearance order.
 *
 * Repeated names are intersected: their `types` list contains only kinds that
 * satisfy every occurrence. Conflicting constraints therefore produce `never`.
 */
export function collectParameters(
  nodes: readonly TemplateNode[],
): readonly TemplateParameter[] {
  const contracts = new Map<string, readonly TemplateValueKind[]>();
  collect(nodes, contracts);

  return Object.freeze(
    [...contracts].map(([name, types]) =>
      Object.freeze({
        name,
        types: Object.freeze([...types]),
        type: typeExpression(types),
      }),
    ),
  );
}

/** Walks a node sequence and merges each parameter's accepted kinds. */
function collect(
  nodes: readonly TemplateNode[],
  contracts: Map<string, readonly TemplateValueKind[]>,
): void {
  for (const node of nodes) {
    if (node.kind === 'text' || node.kind === 'pound') continue;

    if (node.kind !== 'value') {
      // Quantity controls are numbers; select controls are strings.
      merge(contracts, node.name, [node.kind === 'select' ? 'string' : 'number']);
      for (const branch of node.branches.values()) {
        collect(branch, contracts);
      }
      continue;
    }

    merge(
      contracts,
      node.name,
      node.constraint ? constraintKinds(node.constraint) : allKinds,
    );

    if (node.format) {
      merge(
        contracts,
        node.name,
        node.format.kind === 'number' ? ['number'] : ['number', 'Date'],
      );
    }
  }
}

/**
 * Expands a `typeof` constraint to the value kinds it can describe.
 *
 * `object` also covers `null` and `Date`, which are runtime refinements used by
 * the renderer and formatter.
 */
function constraintKinds(constraint: TypeofName): readonly TemplateValueKind[] {
  return constraint === 'object' ? ['object', 'null', 'Date'] : [constraint];
}

/**
 * Intersects `allowed` with the kinds already recorded for `name`.
 *
 * New names start from the full kind list, so the first merge installs the
 * constraint and later merges can only narrow it.
 */
function merge(
  contracts: Map<string, readonly TemplateValueKind[]>,
  name: string,
  allowed: readonly TemplateValueKind[],
): void {
  contracts.set(
    name,
    (contracts.get(name) ?? allKinds).filter(kind => allowed.includes(kind)),
  );
}

/** Renders a kind list as the equivalent TypeScript declaration expression. */
function typeExpression(types: readonly TemplateValueKind[]): string {
  if (types.length === allKinds.length) return 'unknown';
  if (types.length === 0) return 'never';

  // `object` already covers Date in TypeScript; preserve the existing typeof-object approximation.
  return types
    .filter(kind => kind !== 'Date' || !types.includes('object'))
    .map(kind => (kind === 'function' ? 'Function' : kind))
    .join(' | ');
}
