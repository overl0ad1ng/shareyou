import { createI18n, type I18n, type MessageDictionary } from '@shareyou/i18n';
import type { MessageArguments } from '../examples/i18n.generated.js';

const i18n: I18n<MessageArguments> = createI18n<MessageArguments>({ locale: 'en', messages: { en: {} } });
const text: string = i18n.t('cart.items', { count: 3 });
i18n.t('welcome');
i18n.t('welcome', {});
i18n.t('settings.switchAccount', { targetAccount: 'Ada' });
i18n.t('updated', { at: new Date() });
i18n.t('updated', { at: 0 });
i18n.formatNumber(123, { style: 'currency', currency: 'USD' });
i18n.formatDate(new Date(), { timeZone: 'UTC' });
// @ts-expect-error Unknown key.
i18n.t('cart.absent');
// @ts-expect-error Count is required.
i18n.t('cart.items');
// @ts-expect-error Wrong parameter name.
i18n.t('cart.items', { counter: 3 });
// @ts-expect-error Wrong parameter type.
i18n.t('cart.items', { count: '3' });
// @ts-expect-error Extra object literal property.
i18n.t('cart.items', { count: 3, extra: 1 });
// @ts-expect-error No parameters allowed for this message.
i18n.t('welcome', { count: 3 });
// @ts-expect-error Date strings are not date values.
i18n.t('updated', { at: '2026-01-01' });
// @ts-expect-error Locale is read-only.
i18n.locale = 'fr';

const inferred = createI18n({ locale: 'en', messages: { en: { nested: { hello: 'Hello {{name}}' } }, fr: { other: 'Autre' } } });
inferred.t('nested.hello', { name: 'Ada' });
inferred.t('other');
// @ts-expect-error Inferred keys include only resource leaves.
inferred.t('nested');
// @ts-expect-error Inferred keys remain checked even though argument types are dynamic.
inferred.t('missing');
// Untyped templater arguments accept unknown and use String(value), without calling functions.
inferred.t('nested.hello', { name: () => 'Ada' });

const dynamicMessages: MessageDictionary = { hello: 'Hello' };
createI18n({ locale: 'en', messages: { en: dynamicMessages } }).t('dynamic.key', { name: 'Ada' });
void text;
