import {resolveMailSignature,type SignatureLocale} from './signatures';

/** Deterministic HTML rendition of an already signed native text draft.
 * No HTML accepted from model, user draft or inbound email.
 * If no exact native signature is found, preserve the legacy text-only path.
 */
const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const start='\n\n-- Mélodie Digital signature --\n';
const end='\n-- End Mélodie Digital signature --';
const locales:SignatureLocale[]=['fr','en','es','de','it'];
export function htmlFromSignedDraft(sender:string,body:string):string|undefined{
 for(const locale of locales){
  const signature=resolveMailSignature(sender,locale);
  if(!signature)continue;
  const suffix=start+signature.text+end;
  if(!body.endsWith(suffix))continue;
  const message=body.slice(0,-suffix.length);
  if(message.includes(start)||message.includes(end))return undefined;
  const safe=escapeHtml(message).replace(/\r\n|\r|\n/g,'<br>');
  // Inline table colors intentionally work in common email clients without external CSS.
  // The HTML is generated exclusively from escaped body text and canonical signature data.
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#081526" style="width:100%;border-collapse:collapse;background-color:#081526;color:#e6f7ff;font-family:Arial,Helvetica,sans-serif;"><tr><td bgcolor="#081526" style="padding:28px 24px;background-color:#081526;color:#e6f7ff;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;border-collapse:collapse;"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#e6f7ff;word-wrap:break-word;">'+safe+'</td></tr><tr><td style="padding-top:28px;border-top:0;">'+signature.html+'</td></tr></table></td></tr></table>';
 }
 return undefined;
}
