import test from 'node:test';
import assert from 'node:assert/strict';
import {splitMailSignature,joinMailSignature,displayMailText} from '../components/native/mail-signature-presentation';
import {prepareSignedMailDraft} from '../lib/native/mail/signature-draft-preview';
for(const locale of ['fr','en','es','de','it'] as const)test(`signature UI roundtrip preserves the exact signed draft: ${locale}`,()=>{
 const original=prepareSignedMailDraft({sender:'clara@melodie.digital',locale,body:'Bonjour\n\nTexte original <script>non interprété</script>'}).body;
 const parts=splitMailSignature(original);
 assert.notEqual(parts.signature,null);
 assert.equal(joinMailSignature(parts.message,parts.signature),original);
 assert.ok(!displayMailText(original).includes('-- Mélodie Digital signature --'));
 assert.ok(!displayMailText(original).includes('-- End Mélodie Digital signature --'));
 const edited=joinMailSignature('Réponse modifiée',parts.signature);
 assert.equal(splitMailSignature(edited).signature,parts.signature);
});
test('unsigned, malformed or ambiguous bodies are never truncated or reinterpreted',()=>{
 for(const body of ['Texte sans signature','Texte\n\n-- Mélodie Digital signature --\nsans fin','Texte\n\n-- Mélodie Digital signature --\na\n\n-- Mélodie Digital signature --\nb\n-- End Mélodie Digital signature --']){
  assert.deepEqual(splitMailSignature(body),{message:body,signature:null});
  assert.equal(displayMailText(body),body);
 }
});
