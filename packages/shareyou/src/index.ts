import { shareyou as templaterUtilities } from '@shareyou/templater';
import { createI18n } from '@shareyou/i18n';

export * from '@shareyou/templater';
export * from '@shareyou/i18n';

export const shareyou = { ...templaterUtilities, i18n: createI18n };
export default shareyou;
