import test from 'node:test';
import assert from 'node:assert/strict';
import {replySignatureLocale} from '../lib/native/mail/reply-locale';
import {resolveMailSignature} from '../lib/native/mail/signatures';
import registry from '../lib/native/mail/signatures-source.json';
import {readFileSync} from 'node:fs';

test('declared reply language beats different interface locale',()=>{
 for(const language of ['fr','en','es','de','it'] as const){
  assert.equal(replySignatureLocale(JSON.stringify({subject:'Test',body:'Test',language}), 'fr'),language);
 }
 assert.equal(replySignatureLocale(JSON.stringify({subject:'Ciao',body:'Buongiorno',language:'it'}),'de'),'it');
 assert.match(resolveMailSignature('clara@melodie.digital','it')!.text,/Collaboratrice digitale/);
});
test('missing or untrusted reply language is not guessed from UI locale',()=>{
 for(const raw of ['{"subject":"Hallo","body":"Guten Tag"}','{"language":"pt"}','not JSON','{"language":null}']){
  assert.throws(()=>replySignatureLocale(raw,'fr'),/MAIL_REPLY_LANGUAGE_UNVERIFIED/);
 }
});
test('mail preparation uses declared language, not the UI locale',()=>{
 const source=readFileSync('src/lib/native/mail.ts','utf8');
 assert.match(source,/replyLocale=replySignatureLocale\(result\.content,locale\)/);
 assert.match(source,/prepareSignedMailDraft\(\{sender:this\.address,locale:replyLocale,body\}\)/);
 assert.match(source,/language.*MUST identify the language actually used/);
});
test('all five signatures are resolved from site-managed shared snapshot',()=>{
 assert.equal(registry.schema,'melodie.email-signatures.v1');
 for(const [id,profile] of Object.entries(registry.identities)){
  for(const locale of registry.locales){
   const sign=resolveMailSignature(profile.address,locale as 'fr'|'en'|'es'|'de'|'it');
   assert.equal(sign?.identity,id);
   const office=registry.locations[profile.location];
   assert.ok(sign?.text.includes(office.lines.join(' · ')));
   assert.ok(sign?.html.includes(office.lines.join(' · ')));
  }
 }
 const source=readFileSync('src/lib/native/mail/signatures.ts','utf8');
 assert.doesNotMatch(source,/231, rue Saint-Honoré|75001 Paris/);
});
