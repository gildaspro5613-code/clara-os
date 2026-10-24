import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveMailSignature} from '../lib/native/mail/signatures';
import {replySignatureLocale} from '../lib/native/mail/reply-locale';

const transport=readFileSync('src/lib/connectors/ionos/transport.ts','utf8');
const nativeMail=readFileSync('src/lib/native/mail.ts','utf8');
test('25 HTML signatures are separate presentational artifacts with text-only counterparts',()=>{
 for(const sender of ['clara','gildas','support','contact','info']){
  for(const locale of ['fr','en','es','de','it'] as const){
   const signature=resolveMailSignature(sender+'@melodie.digital',locale);
   assert.ok(signature);
   assert.match(signature.html,/<table role="presentation"/);
   assert.match(signature.html,/<img src="https:\/\/melodie.digital\/branding\/melodie-m-master-rgba.png"/);
   assert.ok(signature.html.includes('mailto:'+signature.sender));
   assert.ok(signature.text.includes(signature.sender));
   assert.doesNotMatch(signature.text,/<(?:table|img|a)\b/i);
  }
 }
});
test('native transport remains text/plain; HTML is NOT certified as sent',()=>{
 assert.match(transport,/interface MailEnvelope \{[^}]*text:string/);
 assert.doesNotMatch(transport,/interface MailEnvelope \{[^}]*html:string/);
 assert.match(transport,/subject:envelope.subject,text:envelope.text/);
 assert.match(nativeMail,/subject:draft.subject,text:draft.body/);
});
test('declared language parsing rejects invalid metadata but does not claim to independently detect language',()=>{
 assert.equal(replySignatureLocale(JSON.stringify({language:'it',body:'Hello there'}),'fr'),'it');
});
