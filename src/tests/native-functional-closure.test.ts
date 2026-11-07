import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {nativeFailure} from '@/lib/native/authority';
import {registryBody} from '@/lib/canonical/http';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {withNativeScope,nativeCommands,nativeContext,writableNativeContext} from '@/lib/native/scoped-context';
import {resolveCommercialDraft} from '@/lib/acquisition/commercial-communication-service';
import {NativeMail} from '@/lib/native/mail';
import {nativeMailCommand} from '@/lib/native/mail-authority';
import {saveNativeContact,contactRevision} from '@/lib/native/contacts';
import {seedNativeMailFixture,SimulatedMail} from './helpers/native-mail-fixture';
import type {RegistryQuery} from '@/lib/canonical/registry';

test('Functional closure: real PostgreSQL mail pages, contact persistence, isolation, concurrent edits and additive restore',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const db='native_browser_'+randomUUID().replaceAll('-','');
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'});
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{const r=await promisify(execFile)('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${statement})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}};
 const digest=(u:string)=>createHash('sha256').update(u.repeat(43)).digest('hex'),commands=nativeCommands(query);
 const create=async(u='A',c='c1',p='p1')=>String((await commands({digest:digest(u),workspaceId:'w',clientId:c,projectId:p,sessionId:'native:new'},'create')).sessionId);
 const a=await create(),b=await create('B'),p2=await create('A','c1','p2'),p3=await create('A','c2','p3');
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const request=(u='A',s=a,c='c1',p='p1')=>new Request('https://os.fixture.example/api/contacts?'+new URLSearchParams({workspaceId:'w',clientId:c,projectId:p,sessionId:s}),{headers:{origin:'https://os.fixture.example',cookie:'clara_auth_session='+u.repeat(43)}});
 const run=<T>(f:()=>Promise<T>,r=request(),write=false)=>withNativeScope(r,write,f,query);
 const exports:Record<string,unknown>={},require=createRequire(resolve('src/app/api/contacts/route.ts'));
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/contacts/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(module:string)=>module==='@/lib/native/scoped-context'?{nativeContext,withNativeScope:(r:Request,w:boolean,f:()=>Promise<Response>)=>withNativeScope(r,w,f,query),nativeRequest:async(r:Request,f:()=>Promise<Response>)=>{try{return await withNativeScope(r,true,async()=>{await registryBody(r.clone());return f();},query);}catch(error){return nativeFailure(error);}}}:require(module),Request,Response,URL});
 const post=exports.POST as (r:Request)=>Promise<Response>;
 await t.test('actual contact POST rejects malformed actions, foreign fields and unauthenticated writes',async()=>{
  for(const body of [{action:['update'],name:'Invalid',email:'invalid@example.invalid'},{action:'create',name:'Invalid',email:'invalid@example.invalid',ownerUserId:'b'}]){
   const r=request();const response=await post(new Request(r.url,{method:'POST',headers:{...Object.fromEntries(r.headers),'Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal(response.status,400);
  }
  const response=await post(new Request(request().url,{method:'POST',headers:{origin:'https://os.fixture.example','Content-Type':'application/json'},body:JSON.stringify({action:'create',name:'Anonymous',email:'anonymous@example.invalid'})}));assert.equal(response.status,401);
 });
 seedNativeMailFixture(pg);const provider=new SimulatedMail();provider.uids=Array.from({length:101},(_,i)=>i+1);
 const mail=async()=>new NativeMail('mail-clara',()=>provider).initialize();
 await t.test('101 encrypted messages across stable pages, replay and concurrent sync, revoked/project/user denials',async()=>{
  for(let i=0;i<5;i++)await run(async()=>{await(await mail()).sync('INBOX');},request(),true);
  const first=await run(async()=>await(await mail()).list());assert.equal(first.messages.length,50);assert.ok(first.nextCursor);
  // Timestamp changes must not reorder the immutable keyset.
  pg("UPDATE clara_native_mail_messages SET updated_at=clock_timestamp()");
  const [,second]=await Promise.all([run(async()=>{await(await mail()).sync('INBOX');},request(),true),run(async()=>await(await mail()).list(first.nextCursor!))]);assert.equal(second.messages.length,50);
  const last=await run(async()=>await(await mail()).list(second.nextCursor!));assert.equal(last.messages.length,1);assert.equal(last.nextCursor,null);
  assert.equal(new Set([...first.messages,...second.messages,...last.messages].map(m=>m.id)).size,101);
  assert.deepEqual(await run(async()=>await(await mail()).list(first.nextCursor!)),second);
  await assert.rejects(()=>run(async()=>await(await mail()).list('invalid')));
  await assert.rejects(()=>run(()=>mail(),request('B',b)));
  const id=last.messages[0].id;
  pg(`INSERT INTO clara_native_mail_bindings(message_id,workspace_id,client_id,project_id,owner_user_id) VALUES('${id}','w','c1','p1','a')`);
  for(const r of [request('A',p2,'c1','p2'),request('A',p3,'c2','p3')]){const visible=await run(async()=>await(await mail()).list(second.nextCursor!),r);assert.ok(!visible.messages.some(m=>m.id===id));await assert.rejects(()=>run(async()=>await(await mail()).read(id),r));}
  await run(()=>nativeMailCommand('delegate',{connectionId:'mail-clara',userId:'b'}),request(),true);
  assert.deepEqual((await run(async()=>await(await mail()).list(),request('B',b))).messages.map(m=>m.id),[id]);
  await run(()=>nativeMailCommand('revokeDelegation',{connectionId:'mail-clara',userId:'b'}),request(),true);await assert.rejects(()=>run(()=>mail(),request('B',b)));
  pg(`UPDATE clara_native_mail_bindings SET revoked_at=NOW() WHERE message_id='${id}'`);
  assert.equal((await run(async()=>await(await mail()).list(second.nextCursor!))).messages.length,0);
  const encrypted=pg("SELECT encrypted_payload FROM clara_native_mail_messages LIMIT 1");assert.ok(JSON.parse(encrypted).ciphertext);assert.ok(!encrypted.includes('UNTRUSTED_MAIL'));assert.equal(provider.sent.length,0);
 });
 let contact='';const profile=()=>run(async()=>({record:nativeContext()!.intakes.get(contact),revision:contactRevision(nativeContext()!.acquisitionSnapshots[contact])}));
 await t.test('contact creation, explicit authority, persistence, stale and concurrent edits, foreign resources and revocation',async()=>{
  await assert.rejects(()=>run(()=>saveNativeContact({action:'create',name:'Invalid email',email:'a@b@c.invalid',locale:'fr'}),request(),true));
  contact=(await run(()=>saveNativeContact({action:'create',name:'Reviewed Person',email:'contact@example.invalid',locale:'fr'}),request(),true)).submissionId!;
  let p=await profile();assert.equal(p.record!.contact.name,'Reviewed Person');
  for(const r of [request('B',b),request('A',p2,'c1','p2'),request('A',p3,'c2','p3')]){
   assert.equal(await run(async()=>nativeContext()!.intakes.has(contact),r),false);
   await assert.rejects(()=>run(()=>saveNativeContact({action:'update',submissionId:contact,revision:p.revision,name:'Forbidden',email:'denied@example.invalid',locale:'fr'}),r,true));
  }
  for(const r of [new Request('https://os.fixture.example'),request('invalid'),request('D')])await assert.rejects(()=>run(()=>saveNativeContact({action:'create',name:'Denied',email:'denied@example.invalid',locale:'fr'}),r,true));
  await run(()=>saveNativeContact({action:'update',submissionId:contact,revision:p.revision,name:'Updated Person',email:'updated@example.invalid',locale:'fr'}),request(),true);
  await assert.rejects(()=>run(()=>saveNativeContact({action:'update',submissionId:contact,revision:p.revision,name:'Stale',email:'stale@example.invalid',locale:'fr'}),request(),true));
  p=await profile();assert.equal(p.record!.contact.email,'updated@example.invalid');
  // Both calls take their snapshots BEFORE either commit, exercising real stale commits.
  let arrivals=0;let release!:()=>void;const barrier=new Promise<void>(resolve=>{release=resolve;});
  const edit=(name:string)=>run(async()=>{const result=await saveNativeContact({action:'update',submissionId:contact,revision:p.revision,name,email:'updated@example.invalid',locale:'fr'});if(++arrivals===2)release();await barrier;return result;},request(),true);
  const outcomes=await Promise.allSettled([edit('Winner One'),edit('Winner Two')]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  const fresh=await profile();assert.ok(fresh.record!.contact.name.startsWith('Winner'));
  await assert.rejects(()=>run(()=>saveNativeContact({action:'update',submissionId:'unbound-history',revision:'none',name:'Forbidden',email:'denied@example.invalid',locale:'fr'}),request(),true));
  pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE user_id='a' AND project_id='p1'");await assert.rejects(()=>profile());pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE user_id='a' AND project_id='p1'");
  assert.equal(pg("SELECT COUNT(*) FROM clara_native_resource_authority WHERE resource_id='w/unbound-history'").trim(),'0');
  assert.equal(pg("SELECT COUNT(*) FROM clara_journal_entries WHERE entry->>'summary' IN ('CONTACT_CREATED','CONTACT_UPDATED')").trim(),'3');
  await run(async()=>{writableNativeContext().session.acquisitionSubmissionId=contact;const draft=await resolveCommercialDraft('w',contact);assert.ok(draft);},request(),true);
  const withDraft=await profile(),beforeDraft=pg(`SELECT commercial_draft FROM clara_acquisition_records WHERE submission_id='${contact}'`);
  await assert.rejects(()=>run(()=>saveNativeContact({action:'update',submissionId:contact,revision:withDraft.revision,name:'Must not retarget',email:'other@example.invalid',locale:'fr'}),request(),true),{code:'CONTACT_DRAFT_REVIEW_REQUIRED'});
  assert.equal(pg(`SELECT commercial_draft FROM clara_acquisition_records WHERE submission_id='${contact}'`),beforeDraft);

 });
 await t.test('018/019 reapplication and real dump/restore preserve messages, contacts, history and grants',async()=>{
  const restore=db+'_restore';execFileSync('docker',['exec',container,'createdb','-U','postgres',restore]);
  const fingerprint=(database:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',database,'-qAt','-c',"SELECT md5(string_agg(x::text,'' ORDER BY x::text)) FROM (SELECT to_jsonb(m) x FROM clara_native_mail_messages m UNION ALL SELECT to_jsonb(a) FROM clara_acquisition_records a UNION ALL SELECT to_jsonb(b) FROM clara_native_resource_authority b UNION ALL SELECT to_jsonb(j) FROM clara_journal_entries j)r"],{encoding:'utf8'}).trim();
  const before=fingerprint(db);
  try{
   const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres',db]);execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',restore,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:'pipe'});
   for(const target of [db,restore])for(let pass=0;pass<2;pass++)for(const migration of ['018_native_mail_pagination','019_native_contact_editing'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',target,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+migration+'.sql'),stdio:'pipe'});
   assert.equal(fingerprint(db),before);assert.equal(fingerprint(restore),before);assert.equal((await profile()).record!.contact.email,'updated@example.invalid');
   for(const [oldMigration,restoredMigration,probe] of [
    ['016_native_ionos_mail','018_native_mail_pagination',()=>run(async()=>await(await mail()).list())],
    ['017_native_conversation_continuity','019_native_contact_editing',()=>run(()=>saveNativeContact({action:'create',name:'Must refuse missing migration',email:'blocked@example.invalid',locale:'fr'}),request(),true)],
   ] as const){
    const apply=(migration:string)=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+migration+'.sql'),stdio:'pipe'});
    apply(oldMigration);await assert.rejects(probe);apply(restoredMigration);
   }
   assert.equal(fingerprint(db),before);

  }finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',restore]);}
 });
});
