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

/** Conservative independent lexical cross-check, separate from model language metadata.
 * Never guesses on ambiguous messages; unmistakable conflicting language fails closed.
 * This is not comprehensive linguistic certification.
 */
const markers:Record<SignatureLocale,string[]>={
 fr:['bonjour','cordialement','merci','votre','vous','nous','souhaitons','pouvez','réponse','demande'],
 en:['hello','regards','please','thank','thanks','your','review','response','would','could','kindly'],
 es:['hola','gracias','saludos','usted','ustedes','respuesta','solicitud','estimado','podemos','favor'],
 de:['hallo','danke','grüße','bitte','ihre','ihrer','antwort','anfrage','guten','können'],
 it:['buongiorno','grazie','saluti','gentile','vostra','risposta','richiesta','possiamo','prego','cordiali']
};
export function verifyReplyLanguage(body:string,declared:SignatureLocale):void {
 if(!body.trim()||body.length>20000)throw Error('MAIL_REPLY_LANGUAGE_UNVERIFIED');
 const words=new Set((body.toLocaleLowerCase('und').match(/[\\p{L}]+/gu)??[]));
 const scores=(Object.keys(markers) as SignatureLocale[]).map(lang=>({lang,score:markers[lang].filter(word=>words.has(word)).length})).sort((a,b)=>b.score-a.score);
 const first=scores[0],second=scores[1];
 if(first.lang!==declared && first.score>=2 && first.score>=second.score+2)throw Error('MAIL_REPLY_LANGUAGE_MISMATCH');
}
