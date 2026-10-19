# Shareyou — i18n

Type-safe translations powered by **Shareyou templater**. i18n manages language
resources and fallback; templater owns parsing, parameter contracts, plural/select
blocks and native `Intl` formatting. No third-party runtime template engine is used.

Requires Node.js 22+, ESM and TypeScript 5.4+ for public declarations. Browser
runtimes must provide the native `Intl` APIs.

## Translate

```sh
pnpm add @shareyou/i18n
```

```ts
import { createI18n } from '@shareyou/i18n';

const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages: {
    en: {
      account: { switch: 'Switch to {{name:string}}?' },
      cart: '{{#plural count}}{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}',
      welcome: 'Welcome',
    },
    'zh-CN': {
      account: { switch: '是否切换到 {{name:string}}？' },
      cart: '{{#plural count}}{{:other}}{{#}} 件商品{{/plural}}',
    },
  },
});

i18n.t('account.switch', { name: 'Ada' }); // 是否切换到 Ada？
i18n.t('cart', { count: 3 });              // 3 件商品
i18n.t('welcome');                         // Welcome
i18n.setLocale('en');
i18n.t('cart', { count: 1 });              // 1 item
```

Nested keys use dot paths. Arrays, non-string leaves, empty keys, dotted path
segments and cycles are rejected. Only own enumerable properties are registered.
Instances snapshot their resources and named formats; later edits do not update them.
There is no global language state: create one instance per request on servers.

## Template language and named formats

Messages use the same `{{name:type!}}` syntax as templater. They support nested
`plural`, `ordinal` and `select` blocks, exact quantity branches, offsets and
`{{#}}` for the nearest quantity. Every block needs `other`; all branch parameters
must be supplied. See [templater](https://shareyou.overl0ad1ng.com/docs/templater) for the full grammar.

```ts
const i18n = createI18n({
  locale: 'en', timeZone: 'Asia/Shanghai',
  formats: {
    number: { money: { style: 'currency', currency: 'USD' } },
    date: { short: { dateStyle: 'full', timeZone: 'UTC' } },
  },
  messages: {
    en: { receipt: '{{amount | number:money}} — {{at | date:short}}' },
  },
});
i18n.t('receipt', { amount: 12.5, at: new Date() });
```

A message renders with its dictionary's language. i18n passes that language,
`timeZone`, `formats`, and `typeMismatch: 'throw'` to the compiled templater.
Unlike templater's default warnings, a typed mismatch in i18n always throws.
Untyped placeholders accept `unknown` and use `String(value)` without calling
functions or recursively interpreting inserted text. Output is not HTML-escaped.

Number/date/time format operations require appropriate finite/valid input values.
Unknown format names fail when rendered. Date/time provide `short`, `medium`,
`long`, `full` built-ins; user presets override the same name. Preset timezones
override the instance timezone. Without a configured timezone the environment's
native default applies.

## Generated argument contracts

The CLI reads JSON and compiles messages with templater; it never executes application code.

```sh
pnpm exec shareyou-i18n generate --source locales/en.json --locale zh-CN=locales/zh-CN.json --out i18n.generated.d.ts
```

The output exports `MessageArguments`. Add it as the factory's generic:

```ts
import type { MessageArguments } from './i18n.generated.js';
import en from './locales/en.json' with { type: 'json' };
import zhCN from './locales/zh-CN.json' with { type: 'json' };

const i18n = createI18n<MessageArguments>({
  locale: 'zh-CN', fallbackLocale: 'en', messages: { en, 'zh-CN': zhCN },
});
```

For the included example dictionaries, `i18n.t('cart.items', { count: 3 })` checks
both the key and required numeric argument. Parameterless messages may omit values.
JSON imports require your TypeScript/bundler JSON configuration.

Contracts come directly from templater: untyped parameters are `unknown`, explicit
constraints keep the existing typeof mapping, quantity and numeric format inputs
are `number`, date/time inputs are `Date | number`, and select inputs are `string`.
Repeated names intersect their types; impossible intersections fail resource checks.

Without a generated generic, keys are inferred from resources and values use an
unknown-valued dictionary with runtime checks. Repeat `--locale tag=file` to validate
more translations. Missing translation keys are allowed; extra keys and changed
parameter contracts fail. Quantity categories may differ by language. The CLI
checks grammar/contracts, not format presets defined in application configuration.

Add `--check` to the same command in CI. It writes nothing and exits with status 1
for missing/stale declarations. Generated output is deterministic. Validation
failures preserve existing output; successful writes replace it atomically.

## Locale and errors

Lookup tries the requested language and its parents, then `fallbackLocale` and its
parents, with duplicates removed. Extensions are stripped together before parent
lookup. Tags are canonicalized; duplicate canonical dictionaries are rejected.
The optional fallback must be registered, though the requested language need not be.
Empty strings are valid translations. `locale` is read-only; `setLocale(tag)`
changes it synchronously and preserves the previous value if validation fails.

Final missing keys invoke optional `onError` then return the key. With `strict: true`
they throw instead. Argument/render errors always throw with their original cause;
no fallback hides a bad parameter. There is no implicit logging, and callback
exceptions propagate. Configuration errors throw before an instance is available.

`I18nError` exposes `code`, `key`, `locale`, `attemptedLocales`, and `cause`:

| Code | Meaning |
| --- | --- |
| `INVALID_CONFIG` | Invalid options/language, duplicate tags, unregistered fallback |
| `INVALID_RESOURCE` | Invalid dictionary structure |
| `INVALID_MESSAGE` | Template syntax error or impossible argument contract |
| `MISSING_MESSAGE` | No candidate language has the key |
| `INVALID_ARGUMENT` | Invalid key/parameter, missing own parameter, wrong type |
| `FORMAT_ERROR` | Template rendering or format configuration failed |

`formatNumber(value, Intl.NumberFormatOptions?)` and
`formatDate(Date | number, Intl.DateTimeFormatOptions?)` use the current requested
language. `formatDate` uses the instance timezone unless overridden. Invalid inputs
and options in these standalone methods follow native `Intl` exception behavior.

## Unified import and development

```ts
import shareyou, { createI18n } from '@shareyou/core';
console.log(shareyou.i18n === createI18n); // true
```

Install the standalone i18n package directly to expose its CLI in your application's
`pnpm exec` path. From the repository root:

```sh
pnpm build
pnpm test
pnpm typecheck
pnpm --filter @shareyou/i18n generate:types
pnpm --filter @shareyou/i18n demo
```

Framework bindings, asynchronous loading, hot reload, rich text and translation
extraction are outside this version. Runtime imports do not load CLI filesystem code.

## Project Structure

```text
i18n/
├── src/
│   ├── index.ts                  # Public exports (factory and types)
│   ├── cli.ts                    # Executable entry point
│   ├── cli/                      # `shareyou-i18n generate` command
│   │   ├── args.ts               # Strict flag parsing
│   │   ├── io.ts                 # Resource and declaration I/O
│   │   └── main.ts               # Command orchestration
│   ├── errors/                   # Structured errors and text formatting
│   │   ├── error-text.ts
│   │   ├── i18n-error.ts
│   │   └── index.ts
│   ├── generator/                # Declaration generation and validation
│   │   ├── contract.ts           # Deterministic signature helpers
│   │   ├── declarations.ts       # `MessageArguments` rendering
│   │   ├── validate-translation.ts
│   │   └── index.ts
│   ├── messages/                 # Message compilation and dictionary guards
│   │   ├── analyze-message.ts
│   │   ├── dictionary.ts
│   │   └── index.ts
│   ├── resources/                # Resource flattening and locale lookup
│   │   ├── analyze-dictionary.ts
│   │   ├── locale.ts
│   │   └── index.ts
│   ├── translator/               # Translator factory and runtime behavior
│   │   ├── compile-resources.ts
│   │   ├── create-i18n.ts
│   │   ├── validate-options.ts
│   │   └── index.ts
│   └── types/                    # Public types and key inference
│       ├── i18n.ts
│       ├── inference.ts
│       ├── messages.ts
│       └── index.ts
├── dist/                         # Generated JavaScript and declarations
├── examples/
│   ├── locales/                  # Example dictionaries
│   ├── i18n.generated.d.ts       # Example generated contract
│   └── node.mjs                  # Runnable Node.js demo
├── test/
│   ├── i18n.test.mjs             # Translator behavior tests
│   └── cli.test.mjs              # CLI and declaration tests
├── type-tests/
│   └── i18n.ts                   # Public declaration checks (compile only)
├── package.json
├── tsconfig.json
├── tsconfig.typecheck.json
├── LICENSE
└── README.md
```

Templater owns template parsing, parameter contracts, and rendering; i18n adds
locale selection, resource lookup, fallback, and error context. The CLI shares the
same analyzer and contract helpers, so generated types and runtime checks cannot
drift apart.
