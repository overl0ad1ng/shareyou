/**
 * Compile-time key and fallback-argument inference from literal resources.
 *
 * These types mirror how the runtime flattens nested dictionaries into dot
 * paths. They are used only when the caller does not supply a generated
 * `MessageArguments` contract.
 */

import type {
  MessageDictionary,
  MessageValue,
  MessageResources,
} from './messages.js';

/**
 * Dot-joined leaf keys of one dictionary.
 *
 * A `string` index means the dictionary is dynamic (`MessageDictionary`), so
 * any key is accepted. Literal dictionaries recurse into nested objects.
 */
type MessageKeys<Dictionary> = string extends keyof Dictionary
  ? string
  : {
      [Key in keyof Dictionary & string]: Dictionary[Key] extends string
        ? Key
        : Dictionary[Key] extends MessageDictionary
          ? `${Key}.${MessageKeys<Dictionary[Key]>}`
          : never;
    }[keyof Dictionary & string];

/** All keys reachable across every registered locale dictionary. */
type ResourceKeys<Resources> = {
  [Locale in keyof Resources]: MessageKeys<Resources[Locale]>;
}[keyof Resources] & string;

/**
 * Fallback contract used when no generated contract is supplied.
 *
 * Keys stay statically known, while argument values remain dynamic because
 * template text is not available at the type level in this mode.
 */
export type InferredMessageArguments<Resources extends MessageResources> = {
  readonly [Key in ResourceKeys<Resources>]: Readonly<Record<string, MessageValue>>;
};
