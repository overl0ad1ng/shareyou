# Shareyou

Shareyou is a small collection of shared utilities I built for my own projects.

As I started building more applications, I noticed that I kept writing the same things over and over again: string templates, internationalization, error handling, logging, and other common logic.

None of these were particularly difficult to implement, but each project ended up doing things a little differently.

So I created Shareyou to keep these implementations in one place.

## What is Shareyou?

Shareyou is my personal foundation for building applications. It provides a consistent set of APIs and conventions that I can reuse across projects.

It's not intended to be a traditional general-purpose library, nor is it trying to replace established tools like i18next.

I'm simply trying to avoid maintaining several slightly different implementations of the same functionality.

Shareyou is primarily built around my own needs, but I've made it open source in case someone else finds it useful.

## Packages

| Package               | Description                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `@shareyou/core`      | A single entry point for the available utilities.                                              |
| `@shareyou/templater` | Simple string interpolation with TypeScript support and runtime validation.                    |
| `@shareyou/i18n`      | Internationalization built on Templater, with locale fallback and typed translation arguments. |

I'm also planning to add shared error handling, logging, and a consistent feedback format across applications.

## Usage

You can access the implemented utilities through `@shareyou/core`:

```ts
import shareyou from '@shareyou/core';
```

For example, string interpolation:

```ts
shareyou.templater('Hello, {{name}}!', {
  name: 'Shareyou',
});
// "Hello, Shareyou!"
```

Or internationalization:

```ts
const i18n = shareyou.i18n({
  locale: 'en',
  messages: {
    en: {
      cart: '{{#plural count}}{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}',
    },
  },
});

i18n.t('cart', { count: 3 }); // "3 items"
```

You can find more details in the [i18n documentation](packages/i18n/README.md).

## Development

Shareyou requires Node.js 22+ and pnpm 12.4.2.

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## Documentation

[Shareyou Documentation](https://shareyou.overl0ad1ng.com/docs)

---

Shareyou is an ongoing personal project. I'll continue adding and improving utilities as I need them.

If it happens to fit your needs too, feel free to use it.
