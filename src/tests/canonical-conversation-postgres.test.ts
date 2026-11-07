import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {conversationLinks} from '../lib/canonical/conversation-links';
import type {RegistryQuery} from '../lib/canonical/registry';
const run=promisify(execFile);
test('conversation registry: bilateral proof, native scope, isolation, durable replay, CAS, expiry and revoke',{skip:!process.env.CANONICAL_TEST_CONTAINER},async(t)=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');const db='conversation_'+randomUUID().replaceAll('-','');
 execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const args=['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1'];
 const pg=(q:string)=>execFileSync('docker',[...args,'-c',q],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 for(const f of ['001_authenticated_workspaces.sql','002_verified_auth_identities.sql','008_canonical_client_project_registry.sql','009_canonical_archive_authority.sql','012_native_resource_authority.sql','013_native_scoped_runtime.sql','014_native_commercial_continuity.sql','024_canonical_conversation_links.sql','024_canonical_conversation_links.sql'])execFileSync('docker',['exec','-i',...args.slice(1)],{input:readFileSync('db/migrations/'+f),stdio:['pipe','pipe','pipe']});
 const hash=(v:string)=>createHash('sha256').update(v).digest('hex');const tokens={a:'A'.repeat(43),b:'B'.repeat(43)};
 for(const u of ['a','b']){
  const w='w'+u,c='c'+u;
  pg(`INSERT INTO clara_auth_users(id) VALUES('${u}');INSERT INTO clara_auth_workspaces(id) VALUES('${w}');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','${u}','${u}');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('${u}','${w}','owner');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${hash(tokens[u as 'a'|'b'])}','${u}',NOW()+interval '1 hour');
  INSERT INTO clara_registry_clients VALUES('${w}','${c}','Synthetic','${u}',NOW(),NULL);INSERT INTO clara_registry_client_access VALUES('${w}','${c}','${u}',true,true,true,NULL);
  INSERT INTO clara_registry_identity_links(workspace_id,os_user_id,live_user_id,proof_id) VALUES('${w}','${u}','live-${u}','identity-${u}');`);
  for(const n of ['1','2']){const p='p'+u+n,m='m'+u+n,s='native:'+u+n;const mission={id:m,title:'Synthetic mission',tasks:[],status:'active',progress:0};const data={mission,nativeMissionId:m,conversation:[]};
   pg(`INSERT INTO clara_registry_projects VALUES('${w}','${p}','${c}','Synthetic project','${u}',NOW(),NULL);INSERT INTO clara_registry_project_access VALUES('${w}','${p}','${u}',true,true,true,NULL);INSERT INTO clara_registry_project_links(workspace_id,project_id,client_id,live_project_id,live_user_id,os_user_id,proof_id) VALUES('${w}','${p}','${c}','live-${p}','live-${u}','${u}','proof-${p}');
   INSERT INTO clara_missions(id,data) VALUES('${m}','${JSON.stringify(mission)}');INSERT INTO clara_sessions(id,data) VALUES('${s}','${JSON.stringify(data)}');`);
   for(const [kind,id,table]of [['mission',m,'clara_missions'],['session',s,'clara_sessions']])pg(`INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT '${kind}',id,'${u}','${w}','${c}','${p}',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'${u}','Explicit synthetic canonical conversation ownership review' FROM ${table} WHERE id='${id}'`);
  }
 }
 const snapshots=pg("SELECT jsonb_agg(data ORDER BY id)::text FROM clara_sessions");
 const query:RegistryQuery=async(strings,...values)=>JSON.parse(pg('SELECT COALESCE(json_agg(r),\'[]\') FROM ('+strings.reduce((s,x,i)=>s+x+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'')+')r'));
 const request=(u:'a'|'b'='a',p='pa1',s='native:a1',w='wa',c='ca')=>new Request('https://fixture.invalid/api/native/conversation-links?'+new URLSearchParams({workspaceId:w,clientId:c,projectId:p,sessionId:s}),{headers:{cookie:'clara_auth_session='+tokens[u]}});
 let calls=0;let fail=false;const call=async(path:string,payload:unknown)=>{calls++;if(fail)throw Error('Synthetic lost acknowledgement');const b=payload as {binding:unknown;revision:number};return path.endsWith('verify')?{proof:{schemaVersion:'clara.conversation-link-proof.v1',binding:b.binding,decision:'verified',proofId:'c'.repeat(64),expiresAt:new Date(Date.now()+120000).toISOString()}}:{receipt:{schemaVersion:'clara.conversation-link-stop.v1',binding:b.binding,revision:b.revision,capability:'conversation:link',stopped:true,providerSession:'not_established_by_this_capability'}};};
 const links=conversationLinks(query,call);const a=request();
 const link=await links.request(a,'request-original-0001','live-conversation-a');
 await t.test('pending does not authorize and requests are durable/idempotent',async()=>{
  assert.equal(link.decision,'pending');assert.equal(link.binding.missionId,'ma1');assert.equal(link.binding.capability,'conversation:link');assert.equal(link.binding.osUserId,'a');assert.equal(link.binding.liveUserId,'live-a');
  assert.equal((await conversationLinks(query,call).request(a,'request-original-0001','live-conversation-a')).id,link.id);
  await assert.rejects(links.product('wa',link.id,'authorizeProduct'));
  await assert.rejects(links.request(a,'request-original-0001','other-conversation'));
 });
 await t.test('two users/workspaces/projects/session scopes remain isolated',async()=>{
  for(const r of [request('b'),request('a','pa2'),request('a','pa1','native:a2'),request('a','pa1','external:fake'),request('a','pa1','native:a1','wb','cb')])await assert.rejects(links.command(r,'read',{id:link.id}));
  await assert.rejects(links.product('wb',link.id,'inspectProduct'));
  const b=await links.request(request('b','pb1','native:b1','wb','cb'),'request-original-0001','live-conversation-b');assert.notEqual(b.id,link.id);assert.equal(b.binding.workspaceId,'wb');
 });
 await t.test('proof mismatch is denied before approval, then approval/reload replay only once',async()=>{
  const forged=conversationLinks(query,async()=>({proof:{binding:{...link.binding,missionId:'mb1'}}}));await assert.rejects(forged.approve(a,link.id,1));
  const approved=await links.approve(a,link.id,1);assert.equal(approved.decision,'approved');assert.equal(approved.revision,2);
  const before=calls;assert.equal((await conversationLinks(query,call).approve(a,link.id,1)).revision,2);assert.equal(calls,before);
  assert.equal((await links.product('wa',link.id,'authorizeProduct')).id,link.id);
  assert.equal(pg(`SELECT count(*) FROM clara_registry_audit WHERE target_id='${link.id}' AND action='conversation:approve'`),'1');
 });
 await t.test('concurrent approval replay is serialized and creates one decision',async()=>{
  const proof=(await links.command(a,'read',{id:link.id})).proof;const q=`SELECT clara_registry_conversation_command('${hash(tokens.a)}','wa','ca','pa1','native:a1','approve','${JSON.stringify({id:link.id,expectedRevision:1,proof})}')`;
  const outcomes=await Promise.all(Array.from({length:8},()=>run('docker',[...args,'-c',q])));assert.equal(outcomes.length,8);
  assert.equal(pg(`SELECT count(*) FROM clara_registry_audit WHERE target_id='${link.id}' AND action='conversation:approve'`),'1');
 });
 await t.test('concurrent approval and revocation admit exactly one expected-revision transition',async()=>{
  const race=await links.request(a,'race-request-000001','race-conversation');
  const proof={schemaVersion:'clara.conversation-link-proof.v1',binding:race.binding,decision:'verified',proofId:'d'.repeat(64),expiresAt:new Date(Date.now()+120000).toISOString()};
  const invoke=(op:string,payload:unknown)=>run('docker',[...args,'-c',`SELECT clara_registry_conversation_command('${hash(tokens.a)}','wa','ca','pa1','native:a1','${op}','${JSON.stringify(payload)}')`]);
  const results=await Promise.allSettled([invoke('approve',{id:race.id,expectedRevision:1,proof}),invoke('revoke',{id:race.id,expectedRevision:1})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const current=await links.command(a,'read',{id:race.id});assert.equal(current.revision,2);assert.ok(['approved','revoking'].includes(current.decision));
 });
 await t.test('revocation commits before transport, lost ack pins refusal, retry confirms stop',async()=>{
  fail=true;await assert.rejects(links.revoke(a,link.id,2));assert.equal((await links.command(a,'read',{id:link.id})).decision,'revoking');await assert.rejects(links.product('wa',link.id,'authorizeProduct'));
  const unconfirmed=conversationLinks(query,async(_path,payload)=>({receipt:{schemaVersion:'clara.conversation-link-stop.v1',binding:(payload as {binding:unknown}).binding,revision:3,capability:'conversation:link',stopped:false}}));await assert.rejects(unconfirmed.revoke(a,link.id,2));assert.equal((await links.command(a,'read',{id:link.id})).decision,'revoking');
  fail=false;const revoked=await links.revoke(a,link.id,2);assert.equal(revoked.decision,'revoked');assert.equal(revoked.revision,3);assert.equal((await links.revoke(a,link.id,2)).decision,'revoked');await assert.rejects(links.approve(a,link.id,1));
  assert.equal(pg(`SELECT count(*) FROM clara_registry_audit WHERE target_id='${link.id}' AND action='conversation:revoke'`),'1');
 });
 await t.test('bilateral OS service / Live HTTP routes / PostgreSQL / Mongo survive fresh processes',{skip:!process.env.CONVERSATION_LIVE_REPO},async()=>{
  const repo=process.env.CONVERSATION_LIVE_REPO!,python=process.env.CONVERSATION_TEST_PYTHON!;assert.ok(python);const mongoDb='clara_voice_reception_joint_'+randomUUID().replaceAll('-','');
  const invoke=(input:Record<string,unknown>)=>JSON.parse(execFileSync(python,[repo+'/backend/tests/helpers/conversation_link_fixture.py'],{input:JSON.stringify({pgdb:db,mongoDb,mongoUrl:process.env.CONVERSATION_TEST_MONGO_URL,...input}),env:{...process.env,PYTHONPATH:repo+'/backend'},encoding:'utf8'})) as {status:number;body:Record<string,unknown>};
  const bridge=async(path:string,body:unknown)=>{const r=invoke({path,body,headers:{Authorization:'Bearer synthetic-only-joint-token','x-clara-product':'clara-live'}});if(r.status!==200)throw Error('Live denied '+r.status);return r.body;};
  const service=conversationLinks(query,bridge),joint=await service.request(a,'joint-request-000001','joint-conversation');
  assert.equal(invoke({setup:true,binding:joint.binding}).status,200);
  try{
   assert.equal(invoke({path:'/api/canonical/conversation-links',body:{associationId:joint.id,approve:true},headers:{Authorization:'Bearer synthetic-live-a'}}).status,200);
   assert.equal((await service.approve(a,joint.id,1)).decision,'approved');
   assert.equal(invoke({method:'GET',path:'/api/canonical/conversation-links/'+joint.id,headers:{Authorization:'Bearer synthetic-live-a'}}).status,200);
   assert.equal((await service.revoke(a,joint.id,2)).decision,'revoked');
   assert.equal(invoke({method:'GET',path:'/api/canonical/conversation-links/'+joint.id,headers:{Authorization:'Bearer synthetic-live-a'}}).status,403);
   assert.equal((await conversationLinks(query,bridge).revoke(a,joint.id,2)).decision,'revoked');
  }finally{assert.equal(invoke({cleanup:true}).body.preserved,true);}
 });
 await t.test('expiration, revoked memberships and source proof changes fail closed',async()=>{
  const next=await links.request(a,'request-expiry-00001','next-conversation');pg(`UPDATE clara_registry_conversation_links SET request_expires_at=NOW()-interval '1 second' WHERE id='${next.id}'`);await assert.rejects(links.product('wa',next.id,'inspectProduct'));
  const other=await links.request(a,'request-other-000001','third-conversation');await links.approve(a,other.id,1);
  pg(`UPDATE clara_registry_project_access SET can_manage=false WHERE workspace_id='wa' AND project_id='pa1'`);await assert.rejects(links.product('wa',other.id,'authorizeProduct'));pg(`UPDATE clara_registry_project_access SET can_manage=true WHERE workspace_id='wa' AND project_id='pa1'`);
  pg(`UPDATE clara_registry_identity_links SET proof_id='changed' WHERE workspace_id='wa'`);await assert.rejects(links.product('wa',other.id,'authorizeProduct'));pg(`UPDATE clara_registry_identity_links SET proof_id='identity-a' WHERE workspace_id='wa'`);
  pg(`UPDATE clara_workspace_memberships SET revoked_at=NOW() WHERE user_id='a'`);await assert.rejects(links.product('wa',other.id,'authorizeProduct'));pg(`UPDATE clara_workspace_memberships SET revoked_at=NULL WHERE user_id='a'`);
  pg(`UPDATE clara_registry_conversation_links SET expires_at=NOW()-interval '1 second' WHERE id='${other.id}'`);await assert.rejects(links.product('wa',other.id,'authorizeProduct'));
 });
 await t.test('backup and restore to a fresh PostgreSQL database preserve associations and receipts',()=>{
  const restored='conversation_restore_'+randomUUID().replaceAll('-','');
  execFileSync('docker',['exec',container,'createdb','-U','postgres',restored]);
  try{
   const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres','-d',db],{maxBuffer:16*1024*1024});
   execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',restored,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:['pipe','pipe','pipe']});
   const sql="SELECT jsonb_agg(jsonb_build_object('binding',binding,'decision',decision,'revision',revision,'proof',proof,'stop',stop_receipt) ORDER BY id)::text FROM clara_registry_conversation_links";
   const beforeReapply=pg(sql);
   execFileSync('docker',['exec','-i',...args.slice(1)],{input:readFileSync('db/migrations/024_canonical_conversation_links.sql'),stdio:['pipe','pipe','pipe']});
   assert.equal(pg(sql),beforeReapply);
   const copy=execFileSync('docker',['exec',container,'psql','-U','postgres','-d',restored,'-qAt','-c',sql],{encoding:'utf8'}).trim();assert.equal(copy,pg(sql));
  }finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',restored]);}
 });
 assert.equal(pg("SELECT jsonb_agg(data ORDER BY id)::text FROM clara_sessions"),snapshots);
});
