import type { TemplateOptions } from '../model/index.js';

/*
 * How it works
 *
 * TemplateParameters parses template string types at compile time, following the
 * same placeholder and block syntax as the runtime parser:
 *
 * 1. A general string has no known placeholders, so it accepts a readonly dictionary.
 *    Literal templates proceed through the parser below.
 * 2. ReadParameters scans for {{...}}. ParsePlaceholder trims the body and splits
 *    the parameter name from its optional constraint. Invalid candidates are skipped
 *    one character at a time so valid inner placeholders can still be found.
 * 3. ConstraintValue maps supported typeof names through ConstraintTypes; an omitted
 *    constraint uses unknown. The optional ! changes runtime handling only.
 *    CreateParameter validates the ASCII identifier and creates a required property.
 * 4. ReadParameters intersects those properties, so repeated names must satisfy all
 *    their constraints. UnionToIntersection also combines template union branches,
 *    requiring parameters for every branch until the template is narrowed.
 * 5. Normalize expands the result into readonly properties, or uses a readonly
 *    Record<string, never> when no valid placeholders exist. TemplateParameterNames
 *    reuses the parsed result to expose just the union of valid parameter names.
 *
 * For example, '{{name:string}} {{count:number!}}' becomes
 * { readonly name: string; readonly count: number }.
 * These types describe the caller's contract; runtime checks still verify own
 * properties and typeof results for dynamic templates and JavaScript callers.
 */

/** ASCII lowercase letters used to define identifier starts and their uppercase forms. */
type LowercaseLetter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

/** ASCII digits, allowed only after the first character of a parameter name. */
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
/** Valid first characters of a parameter name, matching the runtime `[A-Za-z_$]`. */
type IdentifierStart = LowercaseLetter | Uppercase<LowercaseLetter> | "_" | "$";
/** Valid subsequent characters, matching runtime `[\w$]` without Unicode identifier extensions. */
type IdentifierCharacter = IdentifierStart | Digit;

/**
 * Whitespace matched by ECMAScript regex `\s`, including spaces, line terminators,
 * and the corresponding Unicode whitespace characters. Sharing the runtime set
 * ensures that static and runtime parsing recognize the same placeholder whitespace.
 */
type Whitespace =
  | " " | "\t" | "\n" | "\r" | "\v" | "\f" | "\u00a0" | "\u1680"
  | "\u2000" | "\u2001" | "\u2002" | "\u2003" | "\u2004" | "\u2005"
  | "\u2006" | "\u2007" | "\u2008" | "\u2009" | "\u200a"
  | "\u2028" | "\u2029" | "\u202f" | "\u205f" | "\u3000" | "\ufeff";

/**
 * Recursively removes {@link Whitespace} from both ends without changing interior characters.
 *
 * @typeParam Source - The placeholder text, parameter name, or constraint to trim.
 */
type Trim<Source extends string> =
  Source extends `${Whitespace}${infer Rest}` ? Trim<Rest>
    : Source extends `${infer Rest}${Whitespace}` ? Trim<Rest>
      : Source;

/**
 * Maps placeholder typeof constraint names to TypeScript value types.
 * `keyof ConstraintTypes` also defines the accepted names; keep these keys aligned
 * with the constraint alternatives in the runtime parser.
 */
type ConstraintTypes = {
  /** String primitives for which `typeof value === "string"`. */
  string: string;
  /** Numbers for which `typeof value === "number"`, including NaN and Infinity. */
  number: number;
  /** Boolean primitives for which `typeof value === "boolean"`. */
  boolean: boolean;
  /** BigInt primitives for which `typeof value === "bigint"`. */
  bigint: bigint;
  /** Symbol primitives for which `typeof value === "symbol"`. */
  symbol: symbol;
  /** The value must be undefined, but the parameter property is still required. */
  undefined: undefined;
  /**
   * Includes objects, arrays, and null, whose typeof result is "object".
   * TypeScript's object also includes functions, so this approximation still needs
   * a runtime typeof check to reject callable values.
   */
  object: object | null;
  /**
   * Uses Function to include arbitrary function signatures and class constructors,
   * which also have typeof "function". Replacement values are neither called nor
   * constructed, so they do not need a shared call signature.
   */
  function: Function;
};

/**
 * Infers an object of required, readonly parameters from a template string type.
 *
 * @typeParam Template - The template string type. Defaults to general `string`,
 * whose placeholders cannot be parsed statically.
 *
 * @remarks
 * `string extends Template` distinguishes a general string from literal templates.
 * A general string has no statically known keys, so it produces
 * `Readonly<Record<string, unknown>>`; literal templates enter the parsing pipeline.
 *
 * Inference proceeds through {@link ReadParameters} to scan and combine placeholders,
 * {@link UnionToIntersection} to combine all template union branches, and
 * {@link Normalize} to expand the intersection into a readonly object.
 * Unconstrained values use unknown; constraints map through {@link ConstraintTypes}.
 * The `!` marker does not change the inferred value type.
 *
 * Repeated names must satisfy every constraint; conflicting constraints make their
 * value type never. Templates with no valid placeholders produce a readonly
 * `Record<string, never>`, disallowing values under any string key. Readonly restricts
 * assignment through this type; it neither freezes the object nor makes values deeply readonly.
 *
 * @example
 * ```ts
 * type Parameters = TemplateParameters<'{{name:string}} {{count:number!}} {{extra}}'>;
 * // { readonly name: string; readonly count: number; readonly extra: unknown }
 *
 * type BothBranches = TemplateParameters<'{{name:string}}' | '{{count:number}}'>;
 * // { readonly name: string; readonly count: number }
 * ```
 */
export type TemplateParameters<Template extends string = string> =
  string extends Template
    ? Readonly<Record<string, unknown>>
    : Normalize<UnionToIntersection<ReadParameters<Template>>>;

/**
 * Extracts a string union of valid placeholder names using the same parsing rules
 * as {@link TemplateParameters}. Invalid names or constraints contribute no names.
 *
 * @typeParam Template - The template string type. General `string` produces string;
 * a literal with no valid placeholders produces never. Template unions produce
 * the union of names from all branches.
 *
 * @example
 * ```ts
 * type Names = TemplateParameterNames<'{{name:string}} {{count:number!}}'>;
 * // 'name' | 'count'
 * ```
 */
export type TemplateParameterNames<Template extends string> =
  string extends Template ? string
    : keyof UnionToIntersection<ReadParameters<Template>> & string;

/**
 * Converts a union into an intersection so an unnarrowed template union requires
 * parameters for every possible branch.
 *
 * @typeParam Members - The parameter object types parsed from individual template branches.
 *
 * @remarks
 * The distributive conditional first places each member in a function parameter,
 * producing a union of function types. Inferring Intersection from that contravariant
 * parameter position then yields the intersection of all members. Callers therefore
 * supply the required parameters regardless of which branch is selected at runtime.
 * Narrowing the template first limits the requirements to the selected branch.
 */
type UnionToIntersection<Members> =
  (Members extends unknown ? (value: Members) => void : never) extends
  (value: infer Intersection) => void ? Intersection : never;

/**
 * Expands accumulated parameter intersections into a readonly object for editor display.
 *
 * @typeParam Parameters - The parameter type after scanning placeholders and combining branches.
 *
 * @remarks
 * With no keys, `Record<string, never>` avoids the empty object type `{}`, which
 * accepts any non-nullish value. Otherwise, the mapped type preserves each combined
 * property type and marks every property readonly.
 */
type Normalize<Parameters> = keyof Parameters extends never
  ? Readonly<Record<string, never>>
  : { readonly [Name in keyof Parameters]: Parameters[Name] };

/**
 * Scans `{{...}}` from left to right, accumulating valid placeholder properties by intersection.
 *
 * @typeParam Source - Unscanned template text. The conditional distributes over template union branches and processes each independently.
 * @typeParam Result - The accumulated parameter object, initially empty. Intersections require repeated names to satisfy every constraint.
 *
 * @remarks
 * After an opening marker, the first closing marker separates Body from Rest.
 * A successful parse continues with Rest. A failed parse skips only the first `{`
 * of the opening marker and scans again, allowing valid inner placeholders inside
 * malformed outer braces to be found, as the runtime parser does. Scanning ends
 * when no opening marker or corresponding closing marker remains.
 */
type ReadParameters<Source extends string, Result = {}> =
  Source extends `${infer _Prefix}{{${infer AfterOpen}`
    ? AfterOpen extends `${infer Body}}}${infer Rest}`
      ? ParsePlaceholder<Body> extends infer Parameter
        ? [Parameter] extends [never]
          // Advance one character so the inner placeholder in {{{name:string}}} is still found.
          ? ReadParameters<`{${AfterOpen}`, Result>
          : ReadParameters<Rest, Result & Parameter>
        : never
      : Result
    : Result;

/**
 * Parses the text inside double braces, separating a name from an optional `:type` constraint.
 *
 * @typeParam Body - The placeholder contents without the surrounding double braces.
 *
 * @remarks
 * Trim removes surrounding whitespace. A colon introduces a constraint; without
 * one, the value type is unknown. {@link CreateParameter} then validates the name
 * and constructs the property. Invalid placeholders produce never.
 */
type ParsePlainPlaceholder<Body extends string> =
  Trim<Body> extends `${infer Name}:${infer Constraint}`
    ? CreateParameter<Trim<Name>, ConstraintValue<Constraint>>
    : CreateParameter<Trim<Body>, unknown>;

/**
 * Resolves a constraint after the colon to its value type, or never for an invalid name.
 *
 * @typeParam Source - Constraint text, possibly containing surrounding whitespace
 * and a trailing strict marker `!`.
 *
 * @remarks
 * Trim whitespace, remove an optional trailing `!`, trim the remaining name, and
 * look it up in ConstraintTypes. The marker changes runtime warning or error
 * handling only. Additional markers and unknown names fail the lookup.
 */
type ConstraintValue<Source extends string> =
  (Trim<Source> extends `${infer Name}!` ? Trim<Name> : Trim<Source>) extends infer Name
    ? Name extends keyof ConstraintTypes ? ConstraintTypes[Name] : never
    : never;

/**
 * Validates a name and value type, producing one required property or never if invalid.
 *
 * @typeParam Name - The parameter name with surrounding whitespace removed.
 * @typeParam Value - The parsed value type; never indicates an invalid constraint.
 *
 * @remarks
 * `[Value] extends [never]` wraps the check in tuples so never is tested directly
 * instead of disappearing through conditional type distribution. The first and
 * subsequent name characters are then checked separately to accept exactly the
 * ASCII identifier syntax supported by the runtime parser.
 */
type CreateParameter<Name extends string, Value> =
  [Value] extends [never] ? never
    : Name extends `${IdentifierStart}${infer Rest}`
      ? IsIdentifierTail<Rest> extends true ? { [Key in Name]: Value } : never
      : never;

/**
 * Checks that every remaining character of a parameter name belongs to {@link IdentifierCharacter}.
 *
 * @typeParam Source - The name suffix after removing a valid first character.
 *
 * @remarks
 * An empty suffix returns true, allowing single-character names. An invalid
 * character returns false immediately; otherwise, validation recurses on the rest.
 */
type IsIdentifierTail<Source extends string> =
  Source extends "" ? true
    : Source extends `${IdentifierCharacter}${infer Rest}` ? IsIdentifierTail<Rest>
      : false;

/** Reads the control name after a block keyword without treating branch labels as parameters. */
type ReadWord<Source extends string, Word extends string = ''> =
  Source extends `${infer Head}${infer Tail}`
    ? Head extends Whitespace ? [Word, Trim<Tail>] : ReadWord<Tail, `${Word}${Head}`>
    : [Word, ''];

type FormatValue<Source extends string> =
  (Trim<Source> extends `${infer Kind}:${string}` ? Trim<Kind> : Trim<Source>) extends infer Kind
    ? Kind extends 'number' ? number : Kind extends 'date' | 'time' ? Date | number : never
    : never;

type ParsePlaceholder<Body extends string> =
  Trim<Body> extends `#${infer Header}`
    ? ReadWord<Header> extends [infer Kind, infer Rest extends string]
      ? Kind extends 'plural' | 'ordinal' | 'select'
        ? ReadWord<Trim<Rest>> extends [infer Name extends string, string]
          ? CreateParameter<Name, Kind extends 'select' ? string : number>
          : never
        : never
      : never
    : Trim<Body> extends `${infer Value}|${infer Format}`
      ? ParsePlainPlaceholder<Value> extends infer Parameter
        ? [Parameter] extends [never] ? never
          : { [Name in keyof Parameter]: Parameter[Name] & FormatValue<Format> }
        : never
      : ParsePlainPlaceholder<Body>;

type BodyRequiresLocale<Body extends string> =
  Trim<Body> extends `#plural${Whitespace}${string}` | `#ordinal${Whitespace}${string}` ? true
    : Trim<Body> extends `${string}|${infer Format}` ? [FormatValue<Format>] extends [never] ? false : true
      : false;

type ScanRequiresLocale<Source extends string> =
  Source extends `${string}{{${infer AfterOpen}`
    ? AfterOpen extends `${infer Body}}}${infer Rest}`
      ? ParsePlaceholder<Body> extends infer Parameter
        ? [Parameter] extends [never] ? ScanRequiresLocale<`{${AfterOpen}`>
          : BodyRequiresLocale<Body> extends true ? true : ScanRequiresLocale<Rest>
        : false
      : false
    : false;

/** Literal templates require locale only when one of their parsed operations uses language rules. */
export type TemplateRenderOptions<Template extends string> =
  string extends Template ? [options?: TemplateOptions]
    : true extends ScanRequiresLocale<Template> ? [options: TemplateOptions & { readonly locale: string }]
      : [options?: TemplateOptions];
