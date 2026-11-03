import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/api/native/mail/setup/route.ts',import.meta.url),'utf8');
test('mail provisioning is production-gated and first mailbox only',()=>{
 assert.match(source,/CLARA_IONOS_PROVISIONING_ENABLED/);
 assert.match(source,/IONOS_MAILBOX_ADDRESSES/);
 assert.match(source,/includes\(b\.address\)/);
 assert.match(source,/w\.role='owner'/);
 assert.match(source,/ca\.can_read AND ca\.can_manage/);
 assert.match(source,/pa\.can_read AND pa\.can_manage/);
});
test('mail provisioning is scoped to authenticated owner and encrypted-at-rest',()=>{
 assert.match(source,/sameOrigin\(request\)/);
 assert.match(source,/withNativeScope\(request,false/);
 assert.match(source,/s\.token_hash=/);
 assert.match(source,/encryptCredentialPayload\(credentials\)/);
 assert.match(source,/NOT EXISTS\(/);
 assert.match(source,/connection_insert AS/);
 assert.match(source,/credential_insert AS/);
 assert.match(source,/authority_insert AS/);
});
test('mail provisioning cannot send mail, enable networks or return secrets',()=>{
 assert.doesNotMatch(source,/sendMail\(|createIonosTransport\(|CLARA_IONOS_NETWORK_ENABLED\s*=/);
 assert.doesNotMatch(source,/console\.|return Response\.json\([^\n]*encrypted/);
});
