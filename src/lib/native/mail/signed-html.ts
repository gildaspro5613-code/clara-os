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
  // Table layouts, explicit bgcolor and inline colors survive most email clients.
  // The plaintext MIME alternative and frozen approval envelope remain unchanged.
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#081526" style="width:100%;border-collapse:collapse;background-color:#081526;color:#e6f7ff;font-family:Arial,Helvetica,sans-serif;">'
   +'<tr><td align="center" style="padding:24px 12px;">'
   +'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0b1b30" style="width:100%;max-width:680px;border-collapse:separate;border-spacing:0;background-color:#0b1b30;border:1px solid #24465b;">'
   +'<tr><td style="padding:28px 26px;color:#e6f7ff;font-size:15px;line-height:1.75;font-family:Arial,Helvetica,sans-serif;">'
   +'<div style="color:#e6f7ff;font-family:Arial,Helvetica,sans-serif;white-space:normal;">'+safe+'</div>'
   +'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-top:24px;border-top:1px solid #24465b;"><tr><td style="padding-top:24px;">'
   +signature.html+'</td></tr></table>'
   +'</td></tr></table></td></tr></table>';
 }
 return undefined;
}
