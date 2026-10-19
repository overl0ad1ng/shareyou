import shareyou, { templater, type TemplateParameters, type TemplateParameterNames } from '@shareyou/templater';

type Expect<Condition extends true> = Condition;
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;

type InferredNames = Expect<Equal<TemplateParameterNames<'{{name:string}} {{count:number!}}'>, 'name' | 'count'>>;
type NoNames = Expect<Equal<TemplateParameterNames<'{{invalid:type}}'>, never>>;
type DynamicNames = Expect<Equal<TemplateParameterNames<string>, string>>;
type UnionNames = Expect<Equal<TemplateParameterNames<'{{name:string}}' | '{{count:number}}'>, 'name' | 'count'>>;

const parameters = { name: 'Shareyou', count: 3 };
const result: string = shareyou.templater('{{name}}', parameters);
const directResult: string = templater('{{count:number!}}', parameters);

const typedParameters: TemplateParameters<'{{name:string}} {{count:number!}}'> = parameters;
templater('{{name}} / {{name}}', { name: false });
templater('{{ name : string ! }} {{_count:number}} {{$active:boolean}}', {
  name: 'Ada', _count: 0, $active: false,
});
templater('{{value}} {{value:string!}}', { value: 'text' });
templater('{{a:bigint}} {{b:symbol}} {{c:undefined}} {{d:object}} {{e:function}}', {
  a: 1n, b: Symbol('id'), c: undefined, d: null, e: (value: number) => value,
});
templater('{{value:object!}}', { value: [] });
templater('{{value:function!}}', { value: class Example {} });
templater('plain text', {});
templater('{{name:unknown}} {{123}} {{}}', {});
templater('{{{name:string}}}', { name: 'Ada' });
templater('{{bad {{name:string}}', { name: 'Ada' });
templater('{{\u00a0name\u2003:\nstring\t!\r}}', { name: 'Ada' });

// A widened string cannot supply compile-time placeholder information.
const dynamicTemplate: string = '{{name:string}}';
const dynamicParameters: TemplateParameters = { name: 123 };
templater(dynamicTemplate, dynamicParameters);

declare const unionTemplate: '{{name:string}}' | '{{count:number}}';
templater(unionTemplate, { name: 'Ada', count: 1 });
// @ts-expect-error An un-narrowed union must provide fields for every possible branch.
templater(unionTemplate, { name: 'Ada' });
// @ts-expect-error The name field is also required until the template is narrowed.
templater(unionTemplate, { count: 1 });

// TypeScript's object includes callables; runtime typeof checks remain authoritative.
templater('{{value:object}}', { value: () => 1 });

// @ts-expect-error Names inferred from the first argument are required.
templater('{{name}} {{count}}', { name: 'Ada' });
// @ts-expect-error The default export keeps the same generic inference.
shareyou.templater('{{name:string}}', { name: 123 });
// @ts-expect-error A misspelled parameter must not replace the required key.
templater('{{name}}', { naem: 'Ada' });
// @ts-expect-error Unused properties in an object literal are rejected.
templater('{{name}}', { name: 'Ada', extra: true });
// @ts-expect-error The string constraint applies before runtime.
templater('{{name:string}}', { name: 123 });
// @ts-expect-error Strict mode keeps the same inferred value type.
templater('{{name:string!}}', { name: 123 });
// @ts-expect-error Number constraints reject strings.
templater('{{count:number}}', { count: '3' });
// @ts-expect-error Boolean constraints reject numbers.
templater('{{active:boolean}}', { active: 1 });
// @ts-expect-error An undefined value is required, not an optional property.
templater('{{value:undefined}}', {});
// @ts-expect-error Object constraints reject primitives.
templater('{{value:object}}', { value: 'object' });
// @ts-expect-error Function constraints reject non-functions.
templater('{{value:function}}', { value: {} });
// @ts-expect-error Both constraints on a repeated name must be satisfied.
templater('{{value:string}} {{value:number}}', { value: 'text' });
// @ts-expect-error Explicitly parameterized types also validate value types.
const invalidParameters: TemplateParameters<'{{count:number}}'> = { count: '3' };

// @ts-expect-error The template must be a string.
templater(123, parameters);
// @ts-expect-error The parameters must be an object.
templater('{{name}}', 'Shareyou');
// @ts-expect-error Both arguments are required.
templater('{{name}}');
// @ts-expect-error Locale must be a string when supplied.
templater('{{name}}', parameters, { locale: 1 });

void result;
void directResult;
void typedParameters;
void invalidParameters;
