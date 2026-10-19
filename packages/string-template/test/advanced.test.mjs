import assert from 'node:assert/strict';
import { test } from 'node:test';
import { templater, compileTemplate } from '@shareyou/templater';

const plural = '{{#plural count}}{{:=0}}Empty{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}';

test('selects exact values and language-specific cardinal categories', () => {
  assert.equal(templater(plural, { count: 0 }, { locale: 'en' }), 'Empty');
  assert.equal(templater(plural, { count: 1 }, { locale: 'en' }), '1 item');
  assert.equal(templater(plural, { count: 2 }, { locale: 'en' }), '2 items');
  const arabic = '{{#plural n}}{{:zero}}zero{{:one}}one{{:two}}two{{:few}}few{{:many}}many{{:other}}other{{/plural}}';
  for (const n of [0, 1, 2, 3, 11, 100]) assert.equal(templater(arabic, { n }, { locale: 'ar' }), new Intl.PluralRules('ar').select(n));
  assert.equal(templater('{{#plural n}}{{:other}}{{#}} 件{{/plural}}', { n: 2 }, { locale: 'zh' }), '2 件');
});

test('applies ordinal rules and offsets without changing the original parameter', () => {
  const ordinal = '{{#ordinal rank}}{{:one}}{{#}}st{{:two}}{{#}}nd{{:few}}{{#}}rd{{:other}}{{#}}th{{/ordinal}}';
  assert.equal(templater(ordinal, { rank: 22 }, { locale: 'en' }), '22nd');
  const offset = '{{#plural n offset=1}}{{:=1}}only you{{:one}}{{n}}: you and one{{:other}}{{n}}: you and {{#}} others{{/plural}}';
  assert.equal(templater(offset, { n: 1 }, { locale: 'en' }), 'only you');
  assert.equal(templater(offset, { n: 2 }, { locale: 'en' }), '2: you and one');
  assert.equal(templater(offset, { n: 4 }, { locale: 'en' }), '4: you and 3 others');
});

test('nests select and quantity blocks and binds pound to the nearest quantity', () => {
  const message = '{{#plural outer}}{{:other}}A{{#}} {{#select who}}{{:female}}her{{:other}}their{{/select}} {{#plural inner}}{{:other}}B{{#}}{{/plural}} C{{#}}{{/plural}}';
  assert.equal(templater(message, { outer: 3, inner: 2, who: 'female' }, { locale: 'en' }), 'A3 her B2 C3');
  assert.equal(templater('{{#select kind}}{{:some-value}}yes{{:other}}no{{/select}}', { kind: 'some-value' }), 'yes');
  assert.equal(templater('{{#select kind}} \n{{:yes}} x \n{{:other}} y {{/select}}', { kind: 'yes' }), ' x \n');
  assert.equal(templater('{{#}}', {}), '{{#}}');
});

test('formats numbers and dates with named formats and explicit locale', () => {
  const at = new Date('2026-01-01T23:30:00Z');
  const options = { locale: 'en', timeZone: 'Asia/Shanghai', formats: { number: { money: { style: 'currency', currency: 'USD' } }, date: { short: { dateStyle: 'full', timeZone: 'UTC' } } } };
  const text = templater('{{amount:number! | number:money}} / {{at | date:short}} / {{at | time:short}}', { amount: 12.5, at }, options);
  assert.equal(text, [new Intl.NumberFormat('en', options.formats.number.money).format(12.5), new Intl.DateTimeFormat('en', options.formats.date.short).format(at), new Intl.DateTimeFormat('en', { timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(at)].join(' / '));
  assert.equal(templater('{{at | date}}', { at }, { locale: 'en', timeZone: 'UTC' }), new Intl.DateTimeFormat('en', { timeZone: 'UTC' }).format(at));
  assert.equal(templater('{{at | time}}', { at }, { locale: 'en', timeZone: 'UTC' }), new Intl.DateTimeFormat('en', { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZone: 'UTC' }).format(at));
});

test('requires locale for language-sensitive templates even if the active branch is literal', () => {
  for (const template of [plural, '{{n | number}}', '{{at | date}}', '{{at | time}}']) {
    assert.throws(() => templater(template, { count: 0, n: 1, at: 0 }), /locale/i);
  }
  assert.throws(() => templater(plural, { count: 1 }, { locale: 'invalid_tag' }), RangeError);
});

test('requires all branch arguments and rejects invalid control/format values', () => {
  const compiled = compileTemplate('{{#select kind}}{{:yes}}{{name:string!}}{{:other}}no{{/select}}');
  assert.throws(() => compiled.render({ kind: 'other' }), ReferenceError);
  assert.throws(() => compiled.render({ kind: 1, name: 'Ada' }), TypeError);
  for (const count of [NaN, Infinity, '3', null]) assert.throws(() => templater(plural, { count }, { locale: 'en' }), TypeError);
  assert.throws(() => templater('{{at | date}}', { at: new Date(NaN) }, { locale: 'en' }), TypeError);
  assert.throws(() => templater('{{n | number}}', { n: Infinity }, { locale: 'en' }), TypeError);
  assert.throws(() => templater('{{n | number:missing}}', { n: 1 }, { locale: 'en' }), /format/i);
});

test('rejects malformed reserved grammar at compilation', () => {
  for (const template of [
    '{{#plural n}}{{:one}}one{{/plural}}',
    '{{#select who}}{{:other}}x{{:other}}y{{/select}}',
    '{{#plural n}}{{:other}}x{{/select}}',
    '{{#plural n}}{{:other}}x',
    '{{#plural n}}bad{{:other}}x{{/plural}}',
    '{{#plural n offset=-1}}{{:other}}x{{/plural}}',
    '{{#plural n}}{{:invalid}}x{{:other}}y{{/plural}}',
    '{{#select n}}{{:=0}}x{{:other}}y{{/select}}',
    '{{/plural}}', '{{:other}}', '{{#unknown x}}', '{{name | unknown}}', '{{name | number | date}}',
  ]) assert.throws(() => compileTemplate(template), SyntaxError, template);
});

test('compiled templates reuse rendering and expose frozen normalized contracts', () => {
  const compiled = compileTemplate('{{plain}} {{n}} {{n:number!}} {{at | date}} {{#select who}}{{:other}}{{name:string}}{{/select}}');
  const contracts = Object.fromEntries(compiled.parameters.map(parameter => [parameter.name, parameter.type]));
  assert.deepEqual(contracts, { plain: 'unknown', n: 'number', at: 'number | Date', who: 'string', name: 'string' });
  assert.ok(Object.isFrozen(compiled.parameters));
  assert.ok(compiled.parameters.every(Object.isFrozen));
  const reused = compileTemplate(plural);
  assert.equal(reused.render({ count: 1 }, { locale: 'en' }), '1 item');
  assert.equal(reused.render({ count: 2 }, { locale: 'en' }), '2 items');
  assert.equal(compileTemplate('{{n:number}} {{n:string}}').parameters[0].type, 'never');
});

test('preserves legacy malformed scanning, literal values and opt-in mismatch errors', t => {
  const warn = t.mock.method(console, 'warn', () => {});
  assert.equal(templater('{{{name:string}}} {{bad {{name:string}}', { name: 'Ada' }), '{Ada} {{bad Ada');
  assert.equal(templater('{{n:number}} {{n:string}}', { n: 1 }), '1 1');
  assert.equal(warn.mock.callCount(), 1);
  assert.throws(() => templater('{{n:number}}', { n: '1' }, { typeMismatch: 'throw' }), TypeError);
  assert.equal(templater('{{value}}', { value: '{{#plural count}}' }), '{{#plural count}}');
});

test('preserves sequential property ownership, coercion and strict-error ordering', () => {
  const parameters = { a: { toString() { parameters.b = 'after'; return 'A'; } }, b: 'before' };
  assert.equal(templater('{{a}} {{b}}', parameters), 'A after');
  assert.throws(() => templater('{{a:number!}} {{b}}', { a: 'bad' }), error => error instanceof TypeError && /`a`/.test(error.message));
  const deleting = Object.create({ b: 'inherited' });
  Object.defineProperty(deleting, 'a', { get() { delete deleting.b; return 'A'; } });
  deleting.b = 'own';
  assert.throws(() => templater('{{a}} {{b}}', deleting), ReferenceError);
});

test('cache identity includes effective inherited and non-enumerable Intl options', () => {
  const compiled = compileTemplate('{{n | number:p}}');
  const inherited = Object.create({ style: 'percent' });
  const hidden = Object.defineProperty({}, 'style', { value: 'percent' });
  for (const p of [inherited, {}, hidden, {}]) {
    assert.equal(compiled.render({ n: 0.5 }, { locale: 'en', formats: { number: { p } } }), new Intl.NumberFormat('en', p).format(0.5));
  }
  const date = compileTemplate('{{at | date:p}}');
  const options = Object.create({ year: 'numeric', timeZone: 'UTC' });
  assert.equal(date.render({ at: 0 }, { locale: 'en', timeZone: 'Asia/Shanghai', formats: { date: { p: options } } }), new Intl.DateTimeFormat('en', options).format(0));
});

test('preserves literal pound spelling outside all quantity blocks', () => {
  assert.equal(templater('A{{ # }}B', {}), 'A{{ # }}B');
  assert.equal(templater('{{#select who}}{{:other}}{{  #  }}{{/select}}', { who: 'other' }), '{{  #  }}');
});
