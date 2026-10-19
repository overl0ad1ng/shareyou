import shareyou, {
  shareyou as namedShareyou,
  templater,
  type TemplateParameters,
  type TemplateParameterNames,
  createI18n,
  type I18n,
} from '@shareyou/core';

const parameters: TemplateParameters<'{{name:string}} {{count:number!}}'> = {
  name: 'Shareyou', count: 3,
};
const parameterName: TemplateParameterNames<'{{name}} {{count:number}}'> = 'count';
const text: string = shareyou.templater('{{name:string}} {{count:number!}}', parameters);
const namedText: string = namedShareyou.templater('{{name:string}}', { name: 'Shareyou' });
const directText: string = templater('{{count:number!}}', { count: 3 });

// @ts-expect-error The aggregate entry preserves required template parameters.
shareyou.templater('{{name}} {{count}}', { name: 'Shareyou' });
// @ts-expect-error The named object preserves inferred parameter types.
namedShareyou.templater('{{count:number!}}', { count: '3' });
// @ts-expect-error Re-exported functions preserve literal template inference.
templater('{{name:string}}', { name: 123 });
// @ts-expect-error Unused object-literal parameters remain errors.
shareyou.templater('{{name}}', { name: 'Shareyou', extra: true });

void [parameterName, text, namedText, directText];

interface Messages {
  readonly hello: { readonly name: string };
  readonly plain: Readonly<Record<string, never>>;
}
const translator: I18n<Messages> = shareyou.i18n<Messages>({ locale: 'en', messages: { en: { hello: 'Hello {{name}}' } } });
translator.t('hello', { name: 'Shareyou' });
translator.t('plain');
createI18n<Messages>({ locale: 'en', messages: { en: {} } }).t('hello', { name: 'Ada' });
// @ts-expect-error Aggregate preserves generated argument contracts.
translator.t('hello');
// @ts-expect-error Aggregate preserves key inference without generated contracts.
namedShareyou.i18n({ locale: 'en', messages: { en: { hello: 'Hello' } } }).t('missing');
