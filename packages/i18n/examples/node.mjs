import { createI18n } from '@shareyou/i18n';
import en from './locales/en.json' with { type: 'json' };
import zhCN from './locales/zh-CN.json' with { type: 'json' };

const i18n = createI18n({ locale: 'zh-CN', fallbackLocale: 'en', timeZone: 'Asia/Shanghai', messages: { en, 'zh-CN': zhCN } });
console.log(i18n.t('settings.switchAccount', { targetAccount: 'hi@overl0ad1ng.com' }));
console.log(i18n.t('cart.items', { count: 3 }));
console.log(i18n.t('welcome'));
console.log(i18n.t('updated', { at: new Date('2026-10-19T12:00:00Z') }));
i18n.setLocale('en');
console.log(i18n.t('cart.items', { count: 1 }));
console.log(i18n.formatNumber(1234.5, { style: 'currency', currency: 'USD' }));
