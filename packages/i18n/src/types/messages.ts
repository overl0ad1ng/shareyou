/**
 * Message resource vocabulary.
 *
 * Resources are plain nested objects whose leaves are template strings. Keeping
 * the shapes here lets resource analysis, inference, and validation share one
 * definition of what a message dictionary is.
 */

/** A value supplied to a message argument. */
export type MessageValue = unknown;

/** Nested message dictionary; every leaf is a message template string. */
export interface MessageDictionary {
  readonly [key: string]: string | MessageDictionary;
}

/** Message dictionaries indexed by locale tag. */
export type MessageResources = Readonly<Record<string, MessageDictionary>>;
