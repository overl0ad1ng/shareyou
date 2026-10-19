# Shareyou

Shareyou is a collection of JavaScript and TypeScript utilities. The aggregate
package provides a single import for all implemented utilities:

```ts
import shareyou from '@shareyou/core';

shareyou.templater('Hello, {{name}}!', { name: 'Shareyou' });
```

## Packages

| Directory | Package | Status |
| --- | --- | --- |
| `packages/shareyou` | `@shareyou/core` | Aggregate entry point |
| `packages/string-template` | `@shareyou/templater` | String interpolation with type inference and runtime checks |
| `packages/i18n` | `@shareyou/i18n` | Templater-based translations, locale fallback, formatting, and generated argument types |

See [the aggregate package documentation](packages/shareyou/README.md) for the
available imports and development details.

## Development

Use Node.js 22 or newer and pnpm 12.4.2. From this directory:

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

These commands build, test, and type-check the aggregate and its implemented
dependencies in dependency order, including i18n and its generated-resource checks.
The documentation app remains a separate project in `docs/`.

## Internationalization

```ts
import shareyou from '@shareyou/core';

const i18n = shareyou.i18n({
  locale: 'en',
  messages: { en: { cart: '{{#plural count}}{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}' } },
});

i18n.t('cart', { count: 3 }); // 3 items
```

See [i18n documentation](packages/i18n/README.md) for generated parameter types,
language fallback, and the standalone `shareyou-i18n` command.
