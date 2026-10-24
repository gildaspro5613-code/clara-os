import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareSignedMailDraft} from '../lib/native/mail/signature-draft-preview';

const mail=readFileSync('src/lib/native/mail.ts','utf8');
test('native preparation signs before existing encrypted save, never SMTP',()=>{
 const prepare=mail.slice(mail.indexOf(' async prepare('),mail.indexOf(' async saveDraft('));
 assert.match(prepare,/prepareSignedMailDraft\(\{sender:this\.address,locale,body\}\)/);
 assert.match(prepare,/if\(!signed\.applied\)throw new RegistryError\(403,'MAIL_SIGNATURE_IDENTITY_UNRECOGNIZED'\)/);
 assert.match(prepare,/this\.saveDraft\(messageId,\{subject,body:signed\.body,recipients:\[mailAddress\(mail\.from\)\],attachmentIds:\[\]\}\)/);
 assert.doesNotMatch(prepare,/sendNativeMail\(|\.send\(|\.approve\(/);
});
test('durable draft still encrypts content and increments revision',()=>{
 const save=mail.slice(mail.indexOf(' async saveDraft('),mail.indexOf(' async submit('));
 assert.match(save,/encryptCredentialPayload\(draft\)/);
 assert.match(save,/revision:\(mission\.emailDraft\?\.revision\?\?0\)\+1/);
 assert.match(save,/MAIL_DRAFT_SAVED/);
});
test('submit, approval and send retain original authority boundaries',()=>{
 assert.match(mail,/encryptedSnapshot:encryptCredentialPayload\(envelope\)/);
 assert.match(mail,/MAIL_OWNER_APPROVAL_REQUIRED/);
 assert.match(mail,/operation:'claim'/);
 assert.match(mail,/MAIL_SEND_ATTEMPT/);
 assert.match(mail,/state='uncertain'/);
});
test('native draft preparation retains original content and no duplicated signature',()=>{
 const input='Message rédigé et soumis à validation';
 const first=prepareSignedMailDraft({sender:'clara@melodie.digital',locale:'fr',body:input});
 assert.equal(first.body.startsWith(input),true);
 assert.equal(prepareSignedMailDraft({sender:'clara@melodie.digital',locale:'fr',body:first.body}).body,first.body);
});
