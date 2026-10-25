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
  return '<div style="font-family:Arial,Helvetica,sans-serif;white-space:normal;">'+safe+'</div><br><br>'+signature.html;
 }
 return undefined;
}
