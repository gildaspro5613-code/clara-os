import type {SignatureLocale} from './signatures';
const locales=new Set(['fr','en','es','de','it']);
/** The model explicitly declares the language of its authored response.
 * Ambiguous/malformed metadata fails closed, never silently follows UI locale.
 */
export function replySignatureLocale(raw:string,interfaceLocale:SignatureLocale):SignatureLocale {
 let parsed:unknown;
 try {parsed=JSON.parse(raw);} catch {throw Error('MAIL_REPLY_LANGUAGE_UNVERIFIED');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('MAIL_REPLY_LANGUAGE_UNVERIFIED');
 const language=(parsed as Record<string,unknown>).language;
 if(typeof language!=='string'||!locales.has(language))throw Error('MAIL_REPLY_LANGUAGE_UNVERIFIED');
 // interfaceLocale is intentionally not used to override the actual reply language.
 void interfaceLocale;
 return language as SignatureLocale;
}
