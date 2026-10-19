import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createI18n, I18nError } from '../dist/index.js';

test('translates nested resources, empty messages, and isolated mutable locales', () => {
  const messages = { en: { account: { hello: 'Hello {{name}}' }, empty: '' }, 'zh-CN': { account: { hello: '你好 {{name}}' } } };
  const a = createI18n({ locale: 'EN', messages });
  const b = createI18n({ locale: 'zh-CN', messages });
  messages.en.account.hello = 'changed';
  assert.equal(a.locale, 'en');
  assert.equal(a.t('account.hello', { name: 'Ada' }), 'Hello Ada');
  assert.equal(a.t('empty'), '');
  a.setLocale('zh-cn');
  assert.equal(a.t('account.hello', { name: 'Ada' }), '你好 Ada');
  b.setLocale('en');
  assert.equal(a.locale, 'zh-CN');
  assert.equal(b.locale, 'en');
  assert.throws(() => { a.locale = 'en'; }, TypeError);
});

test('resolves parents before fallback and formats a fallback with its own language', () => {
  const i18n = createI18n({
    locale: 'fr-CA', fallbackLocale: 'en-GB',
    messages: {
      'fr-CA': {}, fr: { parent: 'parent' }, 'en-GB': {},
      en: { count: '{{#plural count}}{{:one}}one{{:other}}other{{/plural}}' },
    },
  });
  assert.equal(i18n.t('parent'), 'parent');
  assert.equal(i18n.t('count', { count: 0 }), 'other');
  assert.equal(i18n.formatNumber(1234.5), new Intl.NumberFormat('fr-CA').format(1234.5));
});

test('reports final missing keys, deduplicates lookup languages, and supports strict mode', () => {
  const errors = [];
  const i18n = createI18n({ locale: 'en-US', fallbackLocale: 'en', messages: { en: {} }, onError: e => errors.push(e) });
  assert.equal(i18n.t('missing'), 'missing');
  assert.ok(errors[0] instanceof I18nError);
  assert.equal(errors[0].code, 'MISSING_MESSAGE');
  assert.equal(errors[0].key, 'missing');
  assert.equal(errors[0].locale, 'en-US');
  assert.deepEqual(errors[0].attemptedLocales, ['en-US', 'en']);
  const strict = createI18n({ locale: 'en', messages: { en: {} }, strict: true, onError: e => errors.push(e) });
  assert.throws(() => strict.t('absent'), e => e.code === 'MISSING_MESSAGE');
  assert.equal(errors.length, 2);
});

test('renders nested templater select, quantities, offsets and literal parameters', () => {
  const i18n = createI18n({ locale: 'en', messages: { en: {
    nested: '{{#select gender}}{{:female}}{{#plural count}}{{:=0}}none{{:one}}her item{{:other}}her {{#}} items{{/plural}}{{:other}}their {{count | number}} items{{/select}}',
    offset: '{{#plural count offset=1}}{{:=0}}nobody{{:=1}}only you{{:one}}you and one{{:other}}you and {{#}} others{{/plural}}',
    ordinal: '{{#ordinal rank}}{{:one}}{{#}}st{{:two}}{{#}}nd{{:few}}{{#}}rd{{:other}}{{#}}th{{/ordinal}}',
    escaped: '{{literal}} {{name}}', tags: '<b>{{name}}</b>',
  } } });
  assert.equal(i18n.t('nested', { gender: 'female', count: 3 }), 'her 3 items');
  assert.equal(i18n.t('nested', { gender: 'female', count: 0 }), 'none');
  assert.equal(i18n.t('offset', { count: 3 }), 'you and 2 others');
  assert.equal(i18n.t('offset', { count: 1 }), 'only you');
  assert.equal(i18n.t('ordinal', { rank: 22 }), '22nd');
  assert.equal(i18n.t('escaped', { literal: '{{name}}', name: 'Ada' }), '{{name}} Ada');
  assert.equal(i18n.t('tags', { name: 'Ada' }), '<b>Ada</b>');
});

test('uses native plural rules for Chinese and Arabic', () => {
  const i18n = createI18n({ locale: 'ar', messages: {
    ar: { count: '{{#plural n}}{{:zero}}zero{{:one}}one{{:two}}two{{:few}}few{{:many}}many{{:other}}other{{/plural}}' },
    zh: { count: '{{#plural n}}{{:other}}{{#}} 件{{/plural}}' },
  } });
  for (const n of [0, 1, 2, 3, 11, 100]) assert.equal(i18n.t('count', { n }), new Intl.PluralRules('ar').select(n));
  i18n.setLocale('zh');
  assert.equal(i18n.t('count', { n: 3 }), '3 件');
});

test('formats fallback times with the dictionary language hour cycle', () => {
  const at = Date.UTC(2026, 0, 1, 15, 30);
  for (const fallbackLocale of ['en-US', 'en-GB']) {
    const i18n = createI18n({ locale: 'fr-CA', fallbackLocale, timeZone: 'UTC', messages: {
      [fallbackLocale]: { clock: '{{at | time:short}}' },
    } });
    assert.equal(i18n.t('clock', { at }), new Intl.DateTimeFormat(fallbackLocale, { hour: 'numeric', minute: 'numeric', timeZone: 'UTC' }).format(at));
  }
});

test('applies a default timezone inside messages and allows explicit formatter overrides', () => {
  const value = Date.UTC(2026, 0, 1, 23, 30);
  const i18n = createI18n({ locale: 'en', timeZone: 'Asia/Shanghai', formats: { number: { money: { style: 'currency', currency: 'USD' } } }, messages: { en: {
    date: '{{value | date:short}}', time: '{{value | time:short}}', number: '{{value | number:money}}',
  } } });
  assert.equal(i18n.t('date', { value }), new Intl.DateTimeFormat('en', { year: '2-digit', month: 'numeric', day: 'numeric', timeZone: 'Asia/Shanghai' }).format(value));
  assert.equal(i18n.t('time', { value }), new Intl.DateTimeFormat('en', { hour: 'numeric', minute: 'numeric', timeZone: 'Asia/Shanghai' }).format(value));
  assert.equal(i18n.t('number', { value: 12.5 }), new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(12.5));
  assert.equal(i18n.formatDate(value), new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai' }).format(value));
  assert.equal(i18n.formatDate(new Date(value), { timeZone: 'UTC', dateStyle: 'full' }), new Intl.DateTimeFormat('en', { timeZone: 'UTC', dateStyle: 'full' }).format(value));
});

test('rejects invalid resources and templates at construction with contextual causes', () => {
  for (const resource of [[], { x: 2 }, { x: null }, { 'x.y': 'bad' }, { '': 'bad' }]) {
    assert.throws(() => createI18n({ locale: 'en', messages: { en: resource } }), e => e.code === 'INVALID_RESOURCE');
  }
  for (const message of ['{{x | unknown}}', '{{#plural n}}{{:one}}one{{/plural}}', '{{x:number}} {{x:string}}']) {
    assert.throws(() => createI18n({ locale: 'en', messages: { en: { broken: message } } }), e => e.code === 'INVALID_MESSAGE' && e.key === 'broken' && e.cause instanceof Error);
  }
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => createI18n({ locale: 'en', messages: { en: cyclic } }), e => e.code === 'INVALID_RESOURCE');
});

test('validates locale configuration and leaves locale intact after a rejected switch', () => {
  for (const options of [
    { locale: 'bad_locale', messages: { en: {} } },
    { locale: 'en', fallbackLocale: 'fr', messages: { en: {} } },
    { locale: 'en', messages: { en: {}, EN: {} } },
    { locale: 'en', messages: { en: {} }, timeZone: 'invalid/zone' },
  ]) assert.throws(() => createI18n(options), e => e.code === 'INVALID_CONFIG');
  const i18n = createI18n({ locale: 'en', messages: { en: {} } });
  assert.throws(() => i18n.setLocale('bad_locale'), e => e.code === 'INVALID_CONFIG');
  assert.equal(i18n.locale, 'en');
});

test('requires own values for all branches and never hides argument failures with fallback', () => {
  const errors = [];
  const i18n = createI18n({ locale: 'en', fallbackLocale: 'fr', messages: {
    en: { x: '{{n | number}}', branch: '{{#select choice}}{{:a}}{{name}}{{:other}}other{{/select}}' }, fr: { x: 'fallback' },
  }, onError: e => errors.push(e) });
  for (const values of [undefined, { n: '3' }, { n: NaN }, Object.create({ n: 3 }), { n: null }]) {
    assert.throws(() => i18n.t('x', values), e => e.code === 'INVALID_ARGUMENT' && e.key === 'x' && e.cause instanceof Error);
  }
  assert.throws(() => i18n.t('branch', { choice: 'other' }), e => e.code === 'INVALID_ARGUMENT');
  assert.equal(errors.length, 6);
});

test('wraps formatter failures with the original cause and only reports attempted locales', () => {
  const errors = [];
  const i18n = createI18n({ locale: 'en-US', fallbackLocale: 'fr', messages: {
    'en-US': { date: '{{at | date:missing}}' }, fr: { date: 'fallback' },
  }, onError: e => errors.push(e) });
  assert.throws(() => i18n.t('date', { at: 0 }), error => {
    assert.ok(error instanceof I18nError);
    assert.equal(error.code, 'FORMAT_ERROR');
    assert.equal(error.locale, 'en-US');
    assert.equal(error.key, 'date');
    assert.ok(error.cause instanceof RangeError);
    assert.deepEqual(error.attemptedLocales, ['en-US']);
    return true;
  });
  assert.equal(errors.length, 1);
});

test('uses templater strict constraints and snapshots named formats', () => {
  const formats = { number: { money: { style: 'currency', currency: 'USD' } } };
  const i18n = createI18n({ locale: 'en', formats, messages: { en: { money: '{{n | number:money}}', typed: '{{value:number}}', plain: '{{value}}' } } });
  formats.number.money.currency = 'EUR';
  assert.equal(i18n.t('money', { n: 12 }), new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(12));
  assert.throws(() => i18n.t('typed', { value: '3' }), e => e.code === 'INVALID_ARGUMENT');
  assert.equal(i18n.t('plain', { value: false }), 'false');
});

test('snapshots inherited Intl options without changing templater formatting semantics', () => {
  const inherited = { style: 'percent' };
  const p = Object.create(inherited);
  const i18n = createI18n({ locale: 'en', formats: { number: { p } }, messages: { en: { value: '{{n | number:p}}' } } });
  inherited.style = 'decimal';
  assert.equal(i18n.t('value', { n: 0.5 }), '50%');
});

test('removes locale extensions as a unit before looking up parents', () => {
  const i18n = createI18n({ locale: 'en-US-u-hc-h23', messages: { 'en-US': { x: 'parent region' }, en: { x: 'base' } } });
  assert.equal(i18n.t('x'), 'parent region');
});

test('rejects non-string translation keys from JavaScript instead of returning non-string results', () => {
  const errors = [];
  const i18n = createI18n({ locale: 'en', messages: { en: {} }, onError: error => errors.push(error) });
  for (const key of [undefined, null, 1, {}, ['hello']]) {
    assert.throws(() => i18n.t(key), error => error.code === 'INVALID_ARGUMENT' && error.cause instanceof TypeError);
  }
  assert.equal(errors.length, 5);
});

test('ignores inherited resource properties and safely handles prototype-like keys', () => {
  const resource = Object.assign(Object.create({ inherited: 'bad' }), JSON.parse('{"__proto__":"safe","constructor":"also safe"}'));
  const i18n = createI18n({ locale: 'en', messages: { en: resource } });
  assert.equal(i18n.t('inherited'), 'inherited');
  assert.equal(i18n.t('constructor'), 'also safe');
  const own = createI18n({ locale: 'en', messages: { en: JSON.parse('{"__proto__":"safe"}') } });
  assert.equal(own.t('__proto__'), 'safe');
});
