import { compileTemplate, templater, type TemplateParameters, type TemplateParameterNames } from '@shareyou/templater';

const plural = '{{#plural count}}{{:one}}{{name:string!}} has {{#}} item{{:other}}{{#}} items{{/plural}}';
templater(plural, { count: 3, name: 'Ada' }, { locale: 'en' });
compileTemplate(plural).render({ count: 3, name: 'Ada' }, { locale: 'en' });
templater('{{#select who}}{{:female}}she{{:other}}they{{/select}}', { who: 'female' });
templater('{{at | date:short}} {{amount | number:money}}', { at: new Date(), amount: 1 }, { locale: 'en' });
templater('{{at:object! | date}}', { at: new Date() }, { locale: 'en' });
templater('{{name}}', { name: {} }, {});

// @ts-expect-error Language-sensitive literals require explicit options.
templater(plural, { count: 3, name: 'Ada' });
// @ts-expect-error Locale itself is required.
templater(plural, { count: 3, name: 'Ada' }, {});
// @ts-expect-error Compiled literals have the same language requirement.
compileTemplate(plural).render({ count: 3, name: 'Ada' });
// @ts-expect-error Inactive branch parameters are required.
templater(plural, { count: 3 }, { locale: 'en' });
// @ts-expect-error Quantity controls are numbers.
templater(plural, { count: '3', name: 'Ada' }, { locale: 'en' });
// @ts-expect-error Date-format arguments are not strings.
templater('{{at | date}}', { at: '2026-01-01' }, { locale: 'en' });
// @ts-expect-error Numeric format and string constraint conflict.
templater('{{value:string | number}}', { value: '3' }, { locale: 'en' });
// @ts-expect-error Date-only format still requires a language.
templater('{{at | time}}', { at: 0 });

const dynamic: string = '{{value | number}}';
templater(dynamic, { value: 1 }); // Unknown contents are checked at runtime.
declare const union: typeof plural | '{{other:boolean}}';
// @ts-expect-error All possible literal branches contribute parameters.
templater(union, { count: 1, name: 'Ada' }, { locale: 'en' });
templater(union, { count: 1, name: 'Ada', other: true }, { locale: 'en' });
const whitespace = '{{#plural\n n offset=1}}{{:other}}{{n | number}}{{/plural}}';
templater(whitespace, { n: 1 }, { locale: 'en' });

type Names = TemplateParameterNames<typeof plural>;
const controlName: Names = 'count';
const values: TemplateParameters<'{{#ordinal n}}{{:other}}{{at | date}}{{/ordinal}}'> = { n: 1, at: 0 };
void [controlName, values];
