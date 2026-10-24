import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareSignedMailDraft} from '../lib/native/mail/signature-draft-preview';
import {resolveMailSignature,type SignatureLocale} from '../lib/native/mail/signatures';

const locales:SignatureLocale[]=['fr','en','es','de','it'];
const mailboxes=['clara','gildas','support','contact','info'] as const;
test('25 mailbox/locale combinations insert exactly one signature without modifying authored content',()=>{
 for(const id of mailboxes)for(const locale of locales){
  const sender=`${id}@melodie.digital`;
  const first=prepareSignedMailDraft({sender,locale,body:'Bonjour,\nRéponse en attente de validation.'});
  assert.equal(first.applied,true);
  assert.equal(first.signature?.sender,sender);
  assert.ok(first.body.startsWith('Bonjour,\nRéponse en attente de validation.'));
  assert.equal(first.body.split('-- Mélodie Digital signature --').length,2);
  assert.match(first.body,/231, rue Saint-Honoré/);
  assert.equal(prepareSignedMailDraft({sender,locale,body:first.body}).body,first.body);
  assert.match(first.signature!.html,/melodie-m-master-rgba.png/);
  assert.equal(first.signature!.html.includes('Bonjour,'),false);
 }
});
test('unknown or lookalike mailbox is not assigned a signature',()=>{
 for(const sender of ['unknown@melodie.digital','clara@evil.example','clara@melodie.digital.evil','']){
  const v=prepareSignedMailDraft({sender,locale:'fr',body:'Texte original'});
  assert.deepEqual(v,{body:'Texte original',signature:null,applied:false});
 }
});
test('preview is isolated from native mail send, approval and transport',()=>{
 const source=readFileSync('src/lib/native/mail/signature-draft-preview.ts','utf8');
 assert.doesNotMatch(source,/fetch\(|smtp|sendNativeMail|nativeMailCommand|mailCredentialStore|writableNativeContext|saveDraft\(/i);
});
test('existing official preview remains text/plain; HTML is a separate rendition',()=>{
 const s=resolveMailSignature('gildas@melodie.digital','en');
 assert.equal(s?.identity,'gildas');
 assert.match(s!.text,/Founder/);
 assert.match(s!.html,/<table role="presentation"/);
 assert.doesNotMatch(s!.text,/<table|<img/);
});
