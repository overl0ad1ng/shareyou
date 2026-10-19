import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as entry from '@shareyou/core';
import { templater as standaloneTemplater } from '@shareyou/templater';
import { createI18n as standaloneI18n, I18nError } from '@shareyou/i18n';

test('renders templates through the default and named shareyou entry points', () => {
  assert.equal(typeof entry.default?.templater, 'function');
  assert.equal(entry.default, entry.shareyou);
  assert.equal(
    entry.default.templater('Hello, {{name:string}}! {{count:number!}} messages.', {
      name: 'Shareyou', count: 3,
    }),
    'Hello, Shareyou! 3 messages.',
  );
});

test('re-exports the standalone templater without wrapping it', () => {
  assert.equal(typeof entry.templater, 'function');
  assert.equal(entry.templater, standaloneTemplater);
  assert.equal(entry.shareyou.templater, entry.templater);
  assert.equal(entry.templater('{{value}}', { value: '$& {{name}}' }), '$& {{name}}');
  assert.throws(() => entry.templater('{{missing}}', {}), ReferenceError);
});

test('exposes the same i18n factory through named and aggregate imports', () => {
  assert.equal(entry.createI18n, standaloneI18n);
  assert.equal(entry.shareyou.i18n, standaloneI18n);
  assert.equal(entry.I18nError, I18nError);
  const a = entry.shareyou.i18n({ locale: 'en', messages: { en: { hello: 'Hello {{name}}' } } });
  const b = entry.createI18n({ locale: 'fr', messages: { fr: { hello: 'Bonjour' } } });
  assert.equal(a.t('hello', { name: 'Shareyou' }), 'Hello Shareyou');
  a.setLocale('zh');
  assert.equal(b.locale, 'fr');
});
