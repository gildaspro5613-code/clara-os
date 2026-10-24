import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyReplyLanguage} from '../lib/native/mail/reply-locale';
import {readFileSync} from 'node:fs';
test('independent lexical verifier rejects evident FR/EN/ES/DE/IT mismatches',()=>{
 const samples:{lang:'fr'|'en'|'es'|'de'|'it';body:string}[]=[
 {lang:'fr',body:'Bonjour, merci pour votre demande. Nous vous répondrons.'},
 {lang:'en',body:'Hello, thank you for your request. Please review your response.'},
 {lang:'es',body:'Hola, gracias por su solicitud. Saludos, favor de revisar la respuesta.'},
 {lang:'de',body:'Hallo, danke für Ihre Anfrage. Bitte lesen Sie unsere Antwort.'},
 {lang:'it',body:'Buongiorno, grazie per la vostra richiesta. Cordiali saluti.'},
 ];
 for(const s of samples){
  assert.doesNotThrow(()=>verifyReplyLanguage(s.body,s.lang));
  for(const other of samples.filter(x=>x.lang!==s.lang)){
   assert.throws(()=>verifyReplyLanguage(s.body,other.lang),/MAIL_REPLY_LANGUAGE_MISMATCH/,s.lang+' vs '+other.lang);
  }
 }
});
test('short and ambiguous replies never falsely claim confirmed language',()=>{
 assert.doesNotThrow(()=>verifyReplyLanguage('OK','de'));
 assert.doesNotThrow(()=>verifyReplyLanguage('Authorized response, please review.','en'));
 assert.throws(()=>verifyReplyLanguage('   ','en'),/MAIL_REPLY_LANGUAGE_UNVERIFIED/);
});
test('native preparation performs check before saving any signed draft',()=>{
 const source=readFileSync('src/lib/native/mail.ts','utf8');
 const verification=source.indexOf('verifyReplyLanguage(body,replyLocale)');
 const save=source.indexOf('this.saveDraft(messageId');
 assert.ok(verification>=0&&save>verification);
});
test('signature registry sync requires explicit approval and never writes on drift by default',()=>{
 const script=readFileSync('scripts/check-mail-signature-source.mjs','utf8');
 assert.match(script,/SIGNATURE_SOURCE_SYNC_APPROVED/);
 assert.match(script,/--sync-local/);
 assert.match(script,/SIGNATURE_SOURCE_DRIFT/);
 assert.match(script,/SIGNATURE_SOURCE_INVALID_SCHEMA/);
 assert.doesNotMatch(script,/execSync\(|spawn\(|git push|git merge/);
});
