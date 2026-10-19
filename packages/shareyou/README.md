# Shareyou

Shareyou provides one entry point for all implemented Shareyou utility packages.
Import the default `shareyou` object to access utilities through `shareyou.xxx`,
or use named imports for individual functions and types.

Requires Node.js 22 or newer. This package uses ES modules and includes TypeScript
declarations. TypeScript 5.4 or newer is required for template type inference.

## Installation

```sh
pnpm add @shareyou/core
```

## Usage

```ts
import shareyou from '@shareyou/core';

const text = shareyou.templater('Hello, {{name:string}}! {{count:number!}} messages.', {
  name: 'Shareyou',
  count: 3,
});
// Hello, Shareyou! 3 messages.
```

The default and named `shareyou` exports reference the same aggregate object.
You can choose a shorter local name when importing it:

```ts
import _ from '@shareyou/core';

_.templater('Hello, {{name}}!', { name: 'Shareyou' });
```

Functions and types are also available as named exports:

```ts
import { templater, type TemplateParameters } from '@shareyou/core';

const parameters: TemplateParameters<'{{count:number!}}'> = { count: 3 };
const text: string = templater('{{count:number!}} messages.', parameters);
```

Re-exports preserve each function's original implementation and type inference.
Templater still returns a primitive string synchronously, warns on non-strict
type mismatches, and throws on missing parameters or strict type mismatches.

## Included packages

| Package | Object API | Named exports |
| --- | --- | --- |
| `@shareyou/templater` | `shareyou.templater` | `templater`, `TemplateParameters`, `TemplateParameterNames` |
| `@shareyou/i18n` | `shareyou.i18n` (factory) | `createI18n`, `I18nError`, i18n interfaces and types |

Create an isolated translator through the object API or named factory:

```ts
import shareyou, { createI18n } from '@shareyou/core';

console.log(shareyou.i18n === createI18n); // true
const i18n = shareyou.i18n({
  locale: 'en',
  messages: { en: { cart: '{{#plural count}}{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}' } },
});
i18n.t('cart', { count: 3 }); // 3 items
```

See [the i18n package documentation](https://shareyou.overl0ad1ng.com/docs/i18n) for templater syntax, generated
argument contracts, fallback and formatting. Install the standalone i18n package
directly when using its type-generation CLI.

Independent packages remain usable on their own. Importing this aggregate does
not register methods globally or modify the objects exported by those packages.

## Local development

From the repository root:

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm --filter @shareyou/core demo
pnpm --filter @shareyou/core pack
```

Workspace dependencies resolve to local packages during development. Packing
converts `workspace:^` into a regular version range, so the published aggregate
depends on the standalone packages. Publish dependency versions before publishing
the aggregate that requires them.

To include another implemented package, add it to `dependencies`, re-export its
public API in `src/index.ts`, and add its utilities to the aggregate object.
