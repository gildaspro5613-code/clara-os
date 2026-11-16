import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlFromSignedDraft} from '../lib/native/mail/signed-html';
import {prepareSignedMailDraft} from '../lib/native/mail/signature-draft-preview';
import {readFileSync} from 'node:fs';
const locales=['fr','en','es','de','it'] as const;
const identities=['clara','gildas','support','contact','info'] as const;
test('all 25 signed drafts yield matching HTML and retain original text',()=>{
 for(const id of identities)for(const locale of locales){
  const sender=id+'@melodie.digital',message='Hello <script>alert(1)</script> & team\nSecond line';
  const signed=prepareSignedMailDraft({sender,locale,body:message});
  const html=htmlFromSignedDraft(sender,signed.body);
  assert.ok(html, sender+' '+locale);
  assert.match(html!,/Hello &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; team<br>Second line/);
  assert.doesNotMatch(html!,/<script>/);
  assert.match(html!,/<img src="https:\/\/melodie.digital\/branding\//);
  assert.equal(signed.body.startsWith(message),true);
 }
});
test('unsigned, switched identity or edited signature remains text only',()=>{
 assert.equal(htmlFromSignedDraft('clara@melodie.digital','plain text'),undefined);
 const signed=prepareSignedMailDraft({sender:'clara@melodie.digital',locale:'it',body:'Ciao'});
 assert.equal(htmlFromSignedDraft('gildas@melodie.digital',signed.body),undefined);
 assert.equal(htmlFromSignedDraft('clara@melodie.digital',signed.body.replace('Collaboratrice digitale','Other')),undefined);
});
test('HTML frozen before approval and transport uses only encrypted snapshot',()=>{
 const native=readFileSync('src/lib/native/mail.ts','utf8');
 const transport=readFileSync('src/lib/connectors/ionos/transport.ts','utf8');
 const sub=native.slice(native.indexOf(' async submit()'),native.indexOf(' async draft()'));
 assert.match(sub,/htmlFromSignedDraft\(this.address,draft.body\)/);
 assert.match(sub,/encryptedSnapshot:encryptCredentialPayload\(envelope\)/);
 assert.match(transport,/\.\.\.\(envelope.html\?\{html:envelope.html\}:\{\}\)/);
 assert.match(native,/MAIL_OWNER_APPROVAL_REQUIRED/);
});
