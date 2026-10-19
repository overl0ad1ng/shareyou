import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

function workspace(t, source, translation = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'shareyou-i18n-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, 'en.json'), JSON.stringify(source));
  writeFileSync(join(cwd, 'zh.json'), JSON.stringify(translation));
  return {
    cwd,
    run(...args) {
      return spawnSync(process.execPath, [cli, 'generate', '--source', 'en.json', '--locale', 'zh-CN=zh.json', '--out', 'generated.d.ts', ...args], { cwd, encoding: 'utf8' });
    },
  };
}

test('CLI generates templater contracts from every branch outside the workspace', t => {
  const source = {
    z: '{{value}}',
    empty: 'Hello',
    nested: { choice: '{{#select gender}}{{:female}}{{#plural n}}{{:one}}{{name:string}}{{:other}}{{name:string}}: {{#}}{{/plural}}{{:other}}{{at | date:short}}{{/select}}' },
    narrowed: '{{n}} {{n:number}}',
    date: '{{at | date}} {{at | time}}',
    intersect: '{{at | date}} {{at | number}}',
  };
  const w = workspace(t, source, { narrowed: '{{n:number}}' });
  const first = w.run();
  assert.equal(first.status, 0, first.stderr);
  const result = readFileSync(join(w.cwd, 'generated.d.ts'), 'utf8');
  assert.match(result, /export interface MessageArguments/);
  assert.match(result, /readonly "z": \{ readonly "value": unknown; \};/);
  assert.match(result, /readonly "empty": Readonly<Record<string, never>>;/);
  assert.match(result, /readonly "date": \{ readonly "at": number \| Date; \};/);
  assert.match(result, /readonly "intersect": \{ readonly "at": number; \};/);
  assert.match(result, /readonly "nested.choice": \{ readonly "at": number \| Date; readonly "gender": string; readonly "n": number; readonly "name": string; \};/);
  assert.ok(result.indexOf('"date"') < result.indexOf('"z"'));
  assert.equal(w.run().status, 0);
  assert.equal(readFileSync(join(w.cwd, 'generated.d.ts'), 'utf8'), result);
  assert.equal(w.run('--check').status, 0);
});

test('check detects missing and stale declarations without writing', t => {
  const w = workspace(t, { x: 'hello' });
  const missing = w.run('--check');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /generated.d.ts/);
  assert.equal(existsSync(join(w.cwd, 'generated.d.ts')), false);
  assert.equal(w.run().status, 0);
  writeFileSync(join(w.cwd, 'en.json'), '{"x":"{{name}}"}');
  const previous = readFileSync(join(w.cwd, 'generated.d.ts'), 'utf8');
  const stale = w.run('--check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /stale|out.of.date/i);
  assert.equal(readFileSync(join(w.cwd, 'generated.d.ts'), 'utf8'), previous);
});

test('translation validation rejects extra keys, different arguments and incompatible types', t => {
  for (const translation of [{ extra: 'bad' }, { x: '{{other}}' }, { x: '{{n | date}}' }, { x: '{{n | number' }]) {
    const w = workspace(t, { x: '{{n:number}}' }, translation);
    writeFileSync(join(w.cwd, 'generated.d.ts'), 'preserve me');
    const result = w.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /zh.json/);
    assert.match(result.stderr, /x|extra/);
    assert.equal(readFileSync(join(w.cwd, 'generated.d.ts'), 'utf8'), 'preserve me');
  }
});

test('CLI allows language-specific plural categories and missing translation keys', t => {
  const w = workspace(t,
    { count: '{{#plural n}}{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}', missing: 'fallback' },
    { count: '{{#plural n}}{{:other}}{{#}} 件{{/plural}}' },
  );
  assert.equal(w.run().status, 0);
});

test('CLI diagnoses malformed source, missing other and impossible argument intersections', t => {
  for (const message of ['{{n | number', '{{#plural n}}{{:one}}one{{/plural}}', '{{n:number}} {{n:string}}']) {
    const w = workspace(t, { broken: message });
    const result = w.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /en.json/);
    assert.match(result.stderr, /broken/);
    assert.equal(existsSync(join(w.cwd, 'generated.d.ts')), false);
  }
  const w = workspace(t, {});
  writeFileSync(join(w.cwd, 'en.json'), 'not json');
  assert.match(w.run().stderr, /en.json/);
});

test('CLI rejects ambiguous arguments and never overwrites an input resource', t => {
  const w = workspace(t, { x: 'hello' });
  const original = readFileSync(join(w.cwd, 'en.json'), 'utf8');
  for (const args of [
    ['generate', '--source', 'en.json', '--out', 'en.json'],
    ['generate', '--source', 'en.json', '--out', 'x.d.ts', '--locale', 'en=zh.json', '--locale', 'EN=zh.json'],
    ['generate', '--source', 'en.json', '--out', 'x.d.ts', '--locale', 'bad'],
    ['generate', '--out', 'x.d.ts'],
    ['generate', '--source', 'en.json', '--out', 'x.d.ts', '--unknown'],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: w.cwd, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.length > 0);
  }
  assert.equal(readFileSync(join(w.cwd, 'en.json'), 'utf8'), original);
  const help = spawnSync(process.execPath, [cli, '--help'], { cwd: w.cwd, encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--source/);
});
