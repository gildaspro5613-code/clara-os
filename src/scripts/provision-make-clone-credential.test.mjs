import test from 'node:test';
import assert from 'node:assert/strict';
import {
 TARGET, assertCloneUrl, assertSqlPreflight, parseKey, assertDistinctCloneKey, encryptEnvelope, decryptEnvelope,
} from './provision-make-clone-credential.mjs';

const goodUrl='postgresql://'+TARGET.role+':placeholder-only@'+TARGET.hostname+'/'+TARGET.database+'?sslmode=require';
const safe={
 runtime_role:TARGET.role,session_role:TARGET.role,runtime_database:TARGET.database,
 can_provision:true,can_read_connections:false,can_read_credentials:false,
 can_write_credentials:false,can_write_connections:false,
 can_admin_grants:false,can_create_public:false,
};

test('clone connection URL only; no other host, role, database or TLS mode',()=>{
 assert.equal(assertCloneUrl(goodUrl),goodUrl);
 for(const url of [
  goodUrl.replace(TARGET.role,'neondb_owner'),
  goodUrl.replace(TARGET.hostname,'other-host.neon.tech'),
  goodUrl.replace('/neondb?','/postgres?'),
  goodUrl.replace('sslmode=require','sslmode=disable'),
  goodUrl+'&extra=1',goodUrl+'#fragment',
  goodUrl.replace('placeholder-only',''),
 ]) assert.throws(()=>assertCloneUrl(url));
});
test('only the provisioner role and zero direct DB/Make-admin access',()=>{
 assert.equal(assertSqlPreflight(safe),true);
 for(const [key,value] of Object.entries(safe))
  assert.throws(()=>assertSqlPreflight({...safe,[key]:typeof value==='boolean'?!value:'not-approved'}));
});
test('roundtrip AES-256-GCM envelope matches CredentialStore format',()=>{
 const key=Buffer.alloc(32,37);
 const credentials={api:{token:'fixture-only-not-real',zone:'eu1'},
  scenarios:{'find-drive-document':{transport:'api',scenarioId:7295042}}};
 const envelope=encryptEnvelope(credentials,key),fields=JSON.parse(envelope);
 assert.deepEqual(Object.keys(fields).sort(),['ciphertext','iv','tag']);
 assert.equal(Buffer.from(fields.iv,'base64').length,12);
 assert.equal(Buffer.from(fields.tag,'base64').length,16);
 assert.deepEqual(decryptEnvelope(envelope,key),credentials);
 assert.deepEqual(parseKey(key.toString('base64')),key);
 assert.throws(()=>parseKey('bad-key'));
 assert.throws(()=>decryptEnvelope(envelope,Buffer.alloc(32,38)));
});

test('distinct legacy key formats do not block a clone key',()=>{
 const clone=Buffer.alloc(32,37);
 const other=Buffer.alloc(32,38);
 assert.equal(assertDistinctCloneKey(clone,'legacy-key-in-a-different-format'),true);
 assert.equal(assertDistinctCloneKey(clone,other.toString('base64')),true);
 assert.equal(assertDistinctCloneKey(clone,other.toString('hex')),true);
 assert.equal(assertDistinctCloneKey(clone,undefined),true);
 assert.throws(()=>assertDistinctCloneKey(clone,clone.toString('base64')),/separate encryption key/);
 assert.throws(()=>assertDistinctCloneKey(clone,clone.toString('base64url')),/separate encryption key/);
 assert.throws(()=>assertDistinctCloneKey(clone,clone.toString('hex')),/separate encryption key/);
});
