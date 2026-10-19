/**
 * Compiler: parses a template once and bundles everything a render needs.
 *
 * Metadata (`parameters`, `requiresLocale`) and rendering share the same syntax
 * tree, so they cannot disagree about the template grammar.
 */

import type { FormatterCache } from '../formatter/index.js';
import type {
  TemplateNode,
  TemplateOptions,
  TemplateParameter,
} from '../model/index.js';
import { parseTemplate } from '../parser/index.js';
import { renderTemplate } from '../renderer/index.js';
import type {
  TemplateParameters,
  TemplateRenderOptions,
} from '../types/index.js';
import { collectParameters } from './parameters.js';

/** A reusable template instance produced by {@link compileTemplate}. */
export interface CompiledTemplate<Template extends string = string> {
  /** Frozen normalized parameter contracts, in first-appearance order. */
  readonly parameters: readonly TemplateParameter[];
  /** Whether rendering requires an explicit `locale` option. */
  readonly requiresLocale: boolean;
  render(
    parameters: TemplateParameters<Template>,
    ...options: TemplateRenderOptions<Template>
  ): string;
}

/**
 * Parses and analyzes `template` without requiring a locale.
 *
 * The returned object is frozen and owns its formatter cache, so repeated
 * renders reuse Intl formatters while remaining isolated from other templates.
 */
export function compileTemplate<const Template extends string>(
  template: Template,
): CompiledTemplate<Template> {
  const nodes = parseTemplate(template);
  const parameters = collectParameters(nodes);
  const needsLocale = requiresLocale(nodes);
  const cache: FormatterCache = new Map();

  return Object.freeze({
    parameters,
    requiresLocale: needsLocale,
    render(
      input: TemplateParameters<Template>,
      ...options: TemplateRenderOptions<Template>
    ): string {
      return renderTemplate(
        { nodes, parameters, needsLocale, cache },
        input,
        options[0] as TemplateOptions | undefined,
      );
    },
  });
}

/**
 * Reports whether any reachable operation needs language rules.
 *
 * Quantity blocks always do. A select block does only when one of its branches
 * contains a formatted value or a nested quantity block.
 */
function requiresLocale(nodes: readonly TemplateNode[]): boolean {
  return nodes.some(node => {
    if (node.kind === 'plural' || node.kind === 'ordinal') return true;
    if (node.kind === 'value') return node.format !== undefined;
    if (node.kind === 'select') {
      return [...node.branches.values()].some(requiresLocale);
    }
    return false;
  });
}
