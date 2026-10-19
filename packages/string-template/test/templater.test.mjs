import assert from 'node:assert/strict';
import { test } from 'node:test';
import shareyou, { shareyou as namedShareyou, templater } from '@shareyou/templater';

test('exposes the README API through default and named exports', () => {
  assert.equal(shareyou.templater, templater);
  assert.equal(namedShareyou.templater, templater);
});

test('renders the basic README example', () => {
  assert.equal(
    shareyou.templater('This is a template. {{name}}', { name: 'Hello, Shareyou!' }),
    'This is a template. Hello, Shareyou!',
  );
});

test('warns on a type mismatch and still interpolates the value', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  assert.equal(templater('This value must be of type string: {{name:string}}', { name: 123 }),
    'This value must be of type string: 123');
  assert.deepEqual(warn.mock.calls[0].arguments, [
    'Expected template parameter `name` to be of type `string`, but received `number`.',
  ]);
  assert.equal(warn.mock.callCount(), 1);
});

test('throws the README TypeError in strict mode without warning', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  assert.throws(() => templater('{{name:string!}}', { name: 123 }), {
    name: 'TypeError',
    message: 'Expected template parameter `name` to be of type `string`, but received `number`.',
  });
  assert.equal(warn.mock.callCount(), 0);
});

test('accepts matching type constraints without warnings', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  assert.equal(templater('{{name:string!}}: {{count:number}} / {{active:boolean!}}', {
    name: 'Shareyou', count: 0, active: false,
  }), 'Shareyou: 0 / false');
  assert.equal(warn.mock.callCount(), 0);
});

test('supports all JavaScript typeof constraints', () => {
  for (const value of ['text', 42, false, 42n, Symbol('id'), undefined, {}, null, () => 1]) {
    assert.equal(templater(`{{value:${typeof value}!}}`, { value }), String(value));
  }
});

test('replaces repeated placeholders and allows whitespace', () => {
  assert.equal(templater('{{ name }} / {{name}} / {{ name : string ! }}', { name: 'Ada' }),
    'Ada / Ada / Ada');
});

test('rejects callable values under strict object constraints at runtime', () => {
  assert.throws(() => templater('{{value:object!}}', { value: () => 1 }), {
    name: 'TypeError',
    message: 'Expected template parameter `value` to be of type `object`, but received `function`.',
  });
});

test('treats replacement text literally without recursively interpolating it', () => {
  assert.equal(templater('{{value}}', { value: '$& {{other}}', other: 'nested' }), '$& {{other}}');
});

test('leaves text without valid placeholders unchanged', () => {
  for (const template of ['', 'plain text', '{{}}', '{{name', '{{name:unknown}}']) {
    assert.equal(templater(template, {}), template);
  }
});

test('rejects missing parameters instead of silently rendering undefined', () => {
  assert.throws(() => templater('{{missing}}', {}), {
    name: 'ReferenceError', message: 'Missing template parameter `missing`.',
  });
  assert.equal(templater('{{value:undefined!}}', { value: undefined }), 'undefined');
});

test('does not read parameters from the prototype chain', () => {
  assert.throws(() => templater('{{toString}}', {}), ReferenceError);
  assert.throws(() => templater('{{name}}', Object.create({ name: 'inherited' })), ReferenceError);
  const parameters = Object.create(null);
  parameters.name = 'own';
  assert.equal(templater('{{name}}', parameters), 'own');
});

test('validates JavaScript inputs at the public boundary', () => {
  assert.throws(() => templater(null, {}), TypeError);
  for (const parameters of [null, undefined, [], 'text', 123]) {
    assert.throws(() => templater('{{name}}', parameters), TypeError);
  }
});
