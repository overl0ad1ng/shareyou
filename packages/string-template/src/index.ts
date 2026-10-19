/**
 * Public package entry point.
 *
 * The default export groups utilities for `shareyou.templater(...)` usage while
 * named exports expose the compiler, metadata, errors, and option helpers.
 */

import { templater } from './templater.js';

export { templater };
export { compileTemplate, type CompiledTemplate } from './compiler/index.js';
export {
  MissingTemplateParameterError,
  TemplateArgumentError,
} from './model/index.js';
export { snapshotTemplateFormats } from './formatter/index.js';
export type {
  TemplateFormats,
  TemplateOptions,
  TemplateParameter,
  TemplateValueKind,
} from './model/index.js';
export type {
  TemplateParameterNames,
  TemplateParameters,
  TemplateRenderOptions,
} from './types/index.js';

/**
 * Groups template utilities under both a named export and the default export.
 * `shareyou.templater` references the directly exported {@link templater}
 * function and preserves the same generic inference.
 */
export const shareyou = { templater };
export default shareyou;
