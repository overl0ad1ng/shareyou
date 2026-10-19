# shareyou — Templater

shareyou provides stable, consistent interfaces for reusable business logic.

Templater provides typed interpolation, nested plural/ordinal/select blocks, and native Intl formatting.

## Installation

Requires Node.js 22 or newer. This package uses ES modules and includes TypeScript declarations.

```sh
pnpm add @shareyou/templater
```

## Usage

https://shareyou.overl0ad1ng.com/docs/templater

### Basic

`shareyou.templater` returns a string. Plain interpolation uses two arguments; language-sensitive templates additionally require options with an explicit locale.

```ts
import shareyou from "@shareyou/templater";

const result = shareyou.templater(
  "This is a template. {{name}}",
  { name: "Hello, Shareyou!" }
);

console.log(result);
```

The code above outputs `This is a template. Hello, Shareyou!`

### Type Inference

For a literal template, TypeScript infers the second argument's required keys and value types from the first argument:

```ts
import shareyou from "@shareyou/templater";

shareyou.templater(
  "Hello, {{name:string}}! You have {{count:number!}} messages. {{extra}}",
  { name: "Ada", count: 3, extra: true }
);
// Inferred parameters: { readonly name: string; readonly count: number; readonly extra: unknown }

// @ts-expect-error Missing required parameter "count".
shareyou.templater("{{name}} {{count:number}}", { name: "Ada" });

// @ts-expect-error "count" must be a number.
shareyou.templater("{{count:number!}}", { count: "3" });
```

The editor can suggest placeholder names when completing the second argument. Untyped placeholders accept `unknown`; `!` affects runtime error handling and keeps the same inferred value type. Repeated names must satisfy all their constraints. Extra properties in a directly supplied object literal are rejected by TypeScript.

Templates stored in variables keep inference when their literal type is preserved:

```ts
const template = "Hello, {{name:string}}!";
shareyou.templater(template, { name: "Ada" });
```

A template typed as the general `string` type, such as text loaded at runtime, accepts `Readonly<Record<string, unknown>>`. Its placeholders are checked at runtime. TypeScript 5.4 or newer is required for the public declarations.

An un-narrowed union of literal templates requires parameters for every possible branch. Narrow the template first when you want to supply only one branch's parameters.

The `object` constraint maps to TypeScript's `object | null`. TypeScript's `object` also includes functions, whereas JavaScript `typeof` reports them as `"function"`; runtime validation still detects that mismatch.

### Type Constraints

shareyou-templater lets you specify parameter types. TypeScript checks literal templates at compile time; the following JavaScript example demonstrates the runtime warning behavior:

```js
import shareyou from "@shareyou/templater";

shareyou.templater(
  "This value must be of type string: {{name:string}}",
  { name: 123 }
);
```

warning:

```
Expected template parameter `name` to be of type `string`, but received `number`.
```

#### Strict Mode

Type mismatches generate warnings by default. Use `!` to enable strict error handling. It replaces `console.warn` with a `TypeError`, using the same error message as above

```js
import shareyou from "@shareyou/templater";

shareyou.templater(
  "This value must be of type string: {{name:string!}}",
  { name: 123 }
);
```

The strict example throws a `TypeError`; wrap it in `try/catch` when you want to handle the failure.

### Named Exports

```ts
import { shareyou, templater } from "@shareyou/templater";
import type { TemplateParameters } from "@shareyou/templater";

const parameters: TemplateParameters<"Hello, {{name}}!"> = { name: "Shareyou" };
const result: string = templater("Hello, {{name}}!", parameters);

console.log(result); // Hello, Shareyou!
console.log(shareyou.templater("{{count:number!}} messages", { count: 3 }));
```

### Template Rules

| Syntax | Behavior |
| --- | --- |
| `{{name}}` | Insert `String(parameters.name)`. |
| `{{name:string}}` | Check the type, warn on a mismatch, then insert the value. |
| `{{name:string!}}` | Throw a `TypeError` on a mismatch. |

- Type names follow JavaScript `typeof`: `string`, `number`, `boolean`, `bigint`, `symbol`, `undefined`, `object`, and `function`. In particular, `null` and arrays have type `object`.
- Parameter names use ASCII JavaScript identifier syntax, such as `name`, `_name`, or `$name`. Whitespace inside a placeholder is allowed: `{{ name : string ! }}`.
- Only the parameter object's own properties are used. A missing parameter throws a `ReferenceError`. An explicitly supplied `undefined` is a value and renders as `"undefined"`.
- Repeated placeholders are all replaced. Replacement values are treated literally, without recursively interpreting more placeholders or replacement tokens such as `$&`.
- Unsupported or incomplete placeholders, such as `{{name:unknown}}`, are left unchanged. Nested property paths and expression evaluation are not supported.
- Literal templates infer required parameter names and value types at compile time; dynamic strings use a parameter dictionary. Runtime constraints still run for JavaScript callers and data received at runtime. The return type is `string`.
- Output is plain text, without HTML escaping.

## Branches and native formatting

```ts
import { templater, compileTemplate } from '@shareyou/templater';

const message = '{{#plural count}}{{:=0}}Empty{{:one}}{{#}} item{{:other}}{{#}} items{{/plural}}';
templater(message, { count: 3 }, { locale: 'en' }); // 3 items

const compiled = compileTemplate(message);
compiled.render({ count: 1 }, { locale: 'en' });   // 1 item
compiled.render({ count: 3 }, { locale: 'zh' });   // 3 items (other category)
console.log(compiled.parameters); // readonly normalized name/types/type contracts
```

Blocks can nest. Each requires `other`, rejects duplicate/mismatched markers and
preserves branch text whitespace. Only whitespace may precede the first branch;
that prefix is ignored. Quantity rules use the supplied locale, not an environment
default. Exact branches match the original number before category selection.

| Construct | Example |
| --- | --- |
| Cardinal | `{{#plural n}}{{:one}}one{{:other}}other{{/plural}}` |
| Ordinal | `{{#ordinal n}}{{:one}}{{#}}st{{:two}}{{#}}nd{{:few}}{{#}}rd{{:other}}{{#}}th{{/ordinal}}` |
| Offset | `{{#plural n offset=1}}{{:=1}}only you{{:other}}you and {{#}} others{{/plural}}` |
| Select | `{{#select gender}}{{:female}}She{{:male}}He{{:other}}They{{/select}}` |

`{{#}}` formats the nearest enclosing quantity minus its offset, including through
nested select blocks. Outside a quantity it stays literal. `{{n}}` still refers to
the original input. Offsets are nonnegative safe integers. Select branches use ASCII
identifiers, optionally containing hyphens, and require a string control value.
Quantity controls require finite numbers. All branch parameters must be provided
even when inactive; same-name constraints intersect in inferred and generated types.

```ts
templater('{{amount:number! | number:money}} — {{at | date:short}}', {
  amount: 12.5, at: new Date(),
}, {
  locale: 'en', timeZone: 'Asia/Shanghai',
  formats: {
    number: { money: { style: 'currency', currency: 'USD' } },
    date: { short: { dateStyle: 'short' } },
  },
});
```

`| number`, `| date`, `| time` require explicit locale and appropriate input values
(finite number, or valid Date/timestamp). Optional `:preset` references a named
format. Date/time provide short/medium/long/full built-ins, which user presets can
override. A preset timezone overrides `options.timeZone`; omission uses the native
environment timezone. Default time formatting includes hours, minutes and seconds.
Unknown operations fail compilation, unknown format names fail rendering.

Language requirements are checked statically for literals and at runtime for
dynamic strings. Pure select needs no locale unless its branches use formatting
or quantities. `compileTemplate` parses without locale and exposes a frozen
parameter-contract array plus `requiresLocale`; `render` accepts the same options
as `templater`. Compiled instances own their formatter caches.

`typeMismatch: 'throw'` promotes ordinary typed mismatch warnings to errors; `!`
always throws. Default behavior remains `warn`. `TemplateArgumentError` extends
TypeError and `MissingTemplateParameterError` extends ReferenceError, retaining
their native error names. Malformed reserved block/format syntax throws SyntaxError.
Impossible parameter intersections are represented by `type: 'never'` in metadata;
i18n and its CLI reject such dictionaries. Plain legacy interpolation keeps its
per-occurrence warning/strict behavior.

Named exports include `compileTemplate`, `CompiledTemplate`, `TemplateOptions`,
`TemplateFormats`, `TemplateParameter`, `TemplateValueKind`, `TemplateRenderOptions`,
and both parameter-error classes. The default object keeps `shareyou.templater`.
`snapshotTemplateFormats(formats)` snapshots supported effective Intl preset values,
including inherited/nonenumerable options, for adapters such as i18n. Cache keys
and native formatter construction use the same normalized values.
The i18n package uses this same compiler and renderer for all translations and
generates declarations from this metadata. No runtime dependencies are added.

## Local Development

From the `string-template` directory:

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm demo
```

`pnpm demo` builds the package and runs `examples/node.mjs`. It covers basic interpolation, matching types, a warning, and a caught strict-mode error. The warning printed by the demo is intentional.

After building, you can also run the demo directly:

```sh
node examples/node.mjs
```

The demo imports the package by its own name through `package.json` exports, just as a consuming Node.js application does.

## Project Structure

```text
string-template/
├── src/
│   ├── index.ts                  # Public exports
│   ├── templater.ts              # Convenience entry, delegates to compiler
│   ├── model/                    # Shared syntax, option, and error types
│   │   ├── index.ts
│   │   ├── errors.ts             # Public error classes
│   │   ├── nodes.ts              # Syntax tree nodes
│   │   ├── options.ts            # Public rendering options
│   │   ├── parameters.ts         # Normalized parameter contracts
│   │   └── types.ts              # Value and format vocabulary
│   ├── parser/                   # Template grammar and syntax tree
│   │   ├── index.ts
│   │   ├── grammar.ts            # Shared patterns and branch categories
│   │   ├── tokenizer.ts          # Flat placeholder/control tokens
│   │   └── parser.ts             # Nested block assembly
│   ├── compiler/                 # Reusable compiled templates
│   │   ├── index.ts
│   │   ├── compile.ts            # compileTemplate and locale analysis
│   │   └── parameters.ts         # Parameter contract collection
│   ├── renderer/                 # Argument validation and rendering
│   │   ├── index.ts
│   │   ├── arguments.ts          # Parameter reads and type checks
│   │   └── render.ts             # Syntax tree traversal
│   ├── formatter/                # Native Intl formatting
│   │   ├── index.ts
│   │   ├── intl.ts               # Formatter factory and per-compiled cache
│   │   └── options.ts            # Option validation and normalization
│   └── types/                    # Template literal type inference
│       ├── index.ts
│       └── template-parameters.ts
├── dist/                         # Generated JavaScript and declarations
├── examples/
│   └── node.mjs                  # Runnable Node.js demo
├── test/
│   ├── templater.test.mjs        # Core runtime behavior tests
│   └── advanced.test.mjs         # Blocks, formatting, and contracts
├── type-tests/
│   ├── templater.ts              # Public declaration checks (compile only)
│   └── advanced.ts               # Blocks and formatting declarations
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.typecheck.json
├── LICENSE
└── README.md
```

There are no runtime dependencies. TypeScript is a development dependency; tests use Node.js's built-in test runner. `pnpm pack` builds first and packages `dist/`, `README.md`, `LICENSE`, and `package.json` for distribution.
