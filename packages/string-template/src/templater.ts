/**
 * Public convenience API.
 *
 * `templater` compiles and renders in one call. Use `compileTemplate` directly
 * when the same template is rendered repeatedly.
 */

import { compileTemplate } from './compiler/index.js';
import type {
  TemplateParameters,
  TemplateRenderOptions,
} from './types/index.js';

export type { TemplateParameters } from './types/index.js';

/**
 * Renders Shareyou placeholders, nested quantity/select blocks and named Intl
 * formats.
 *
 * Existing `{{name:type!}}` interpolation retains its type warnings and strict
 * marker. Language-sensitive literal templates require `options.locale`;
 * dynamic strings are checked at runtime. Parameter values are inserted
 * literally, without HTML escaping.
 */
export function templater<const Template extends string>(
  template: Template,
  parameters: TemplateParameters<NoInfer<Template>>,
  ...options: TemplateRenderOptions<NoInfer<Template>>
): string {
  return compileTemplate(template).render(parameters, ...options);
}
