import {seedNativeMailFixture,SimulatedMail} from './helpers/native-mail-fixture';
import {NativeMail} from '@/lib/native/mail';
import {seedGoogleWork,SimulatedGoogleWork} from './helpers/native-google-work-fixture';
import {CalendarClient} from '@/lib/connectors/google/calendar/calendar-client';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {withNativeScope,writableNativeContext,nativeCommands,nativeContext,nativeMission} from '@/lib/native/scoped-context';
import {googleProofHash} from '@/lib/native/google-authority';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';
import {Clara} from '@/lib/core/clara';
import {dispatchEvent} from '@/lib/core/event-bus';
import {EventType} from '@/types';

import {buildBrainSources} from '@/lib/brain/brain-source-registry';
import {NativeGoogleWork} from '@/lib/native/google-work';
import {DriveClient} from '@/lib/connectors/internal/google/drive/drive-client';
import {GoogleReauthRequiredError} from '@/lib/connectors/google/auth/google-auth-error';
import {nativeGoogleCommand} from '@/lib/native/google-authority';

test('operational recovery through scoped runtime and real PostgreSQL persistence',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container='clara-canonical-test-postgres';assert.equal(process.env.CANONICAL_TEST_CONTAINER,container);
 const db='native_browser_'+randomUUID().replaceAll('-','');execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(q:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8',stdio:'pipe'}).trim();
 const query:RegistryQuery=async(strings,...values)=>{const sql=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{const r=await promisify(execFile)('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(t) FROM (${sql})t`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}};
 const command=nativeCommands(query),scope=(s:string,p='p1',u='A')=>({digest:googleProofHash(u.repeat(43)),workspaceId:'w',clientId:'c1',projectId:p,sessionId:s});
 const create=async(p='p1')=>String((await command(scope('native:new',p),'create')).sessionId);
 const sid=await create();
 process.env.CLARA_AUTH_APP_ORIGIN='https://fixture.invalid';process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const request=(s=sid,p='p1',u='A')=>new Request('https://fixture.invalid/api?'+new URLSearchParams({workspaceId:'w',clientId:'c1',projectId:p,sessionId:s}),{headers:{cookie:'clara_auth_session='+u.repeat(43),origin:'https://fixture.invalid'}});
 const run=<T>(f:()=>Promise<T>,s=sid,p='p1',u='A')=>withNativeScope(request(s,p,u),true,f,query);
 // Execute the actual HTTP handler; inject only the local SQL transport, retaining
 // real authentication/authority checks and real native document implementation.
 const require=createRequire(import.meta.url),exports:Record<string,unknown>={};
 const source=readFileSync('src/app/api/documents/route.ts','utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Response,Request,URL,TextDecoder,require:(name:string)=>name==='@/lib/native/scoped-context'?{withNativeScope:(r:Request,w:boolean,f:()=>Promise<unknown>)=>withNativeScope(r,w,f,query),nativeRequest:()=>{throw Error('POST not used by diagnostic harness');}}:require(name)});
 const documentsGET=exports.GET as (request:Request)=>Promise<Response>;


 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>({success:true,responseStatus:'completed',content:JSON.stringify({intent:'Preparation',summary:'Synthetic scoped task',confidence:.8,entities:[],actions:['Verifier les informations'],nextAction:'Verifier les informations',importance:.5,urgency:.3,impact:.5})}));
 const event=(message:string)=>({id:randomUUID(),type:EventType.USER_MESSAGE,source:'CLARA_CHAT',timestamp:new Date(),payload:{message}});
 const cycle=async(message:string)=>run(async()=>{const c=nativeContext()!;return dispatchEvent(new Clara(c.scope.sessionId,c.scope.workspaceId),event(message));});
 await t.test('consultation in empty thread does not create a mission',async()=>{
  const infoSid=await create();await run(async()=>{const c=nativeContext()!;await dispatchEvent(new Clara(c.scope.sessionId,c.scope.workspaceId),event('Quelle est ma mission active ?'));},infoSid);assert.equal((await command(scope(infoSid),'read')).session.mission,null);await run(async()=>{const c=nativeContext()!;await dispatchEvent(new Clara(c.scope.sessionId,c.scope.workspaceId),event('Quel est le contexte ?'));},infoSid);
 });
 await t.test('historical unproven thread cannot be certified by a forged marker',async()=>{
  const historical=await create();pg(`UPDATE clara_sessions SET data=jsonb_set(data,'{conversation}','[{"id":"historical","role":"user","content":"synthetic","createdAt":"2026-10-27T00:00:00Z"}]') WHERE id='${historical}'`);
  pg(`UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='session' AND resource_id='${historical}';INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT 'session',id,'a','w','c1','p1',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Explicit synthetic ownership attestation, not conversation attribution' FROM clara_sessions WHERE id='${historical}'`);
  const raw=await command(scope(historical),'read');
  await assert.rejects(command(scope(historical),'commit',{expected:raw.session,session:{...raw.session,nativeConsultationVersion:1},missions:[],journal:[]}),{status:409});
 });
 await t.test('explicit command creates an authorized mission',async()=>{
  const result=await cycle('Crée une mission de préparation');assert.ok(result.mission?.id);assert.equal(result.mission?.status,'active');
 });
 await t.test('consultation cannot replan/reactivate/execute or alter a blocked mission; history remains durable',async()=>{
  await run(async()=>{const c=writableNativeContext(),m={...c.session.mission!,status:'blocked' as const};nativeMission(m);c.session.mission=m;c.session.conversation=[{id:randomUUID(),role:'user',content:'Historical synthetic conversation',createdAt:new Date()}];});
  const before=(await command(scope(sid),'read')).session;await cycle('Montre la mission et son état');
  const after=(await command(scope(sid),'read')).session;assert.deepEqual(after.mission,before.mission);assert.deepEqual(after.conversation,before.conversation);
  assert.ok(Number(pg("SELECT count(*) FROM clara_journal_entries"))>0);
 });
 await t.test('unselected Google connection has precise HTTP diagnostic and no provider access',async()=>{
  const r=await documentsGET(request());assert.equal(r.status,409);assert.deepEqual(await r.json(),{success:false,code:'NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED'});
 });
 await t.test('native calendar missing binding and mailbox missing authority are explicit, no global fallback',async()=>{
  const contexts=await run(()=>buildBrainSources(event('Mon agenda et mes courriels'),new Date()));
  assert.ok(contexts.some(s=>s.summary.includes('GOOGLE_CALENDAR_SELECTION_REQUIRED')));
  assert.ok(contexts.some(s=>s.summary.includes('MAIL_AUTHORITY_REQUIRED')));
 });
 await t.test('selected-calendar cognition reuses real scoped authority and no mutation transport',async()=>{
  seedGoogleWork(pg);const provider=new SimulatedGoogleWork();
  const drive=t.mock.method(DriveClient.prototype,'create',async()=>provider.clients().drive);
  const calendar=t.mock.method(CalendarClient.prototype,'create',async()=>provider.clients().calendar);
  try{
   await run(async()=>{const c=writableNativeContext();c.session.googleConnectionId='google-work-a';const work=await new NativeGoogleWork('google-work-a').initialize();const inspected=await work.inspect('calendar','calendar-a');await work.bind('calendar','calendar-a',inspected.resource.version!);});
   await run(async()=>{await(await new NativeGoogleWork('google-work-a').initialize()).select('calendar','calendar-a');});
   const contexts=await run(()=>buildBrainSources(event('Mon agenda'),new Date()));assert.equal(contexts[0].available,true);assert.equal((contexts[0].data as {calendarId:string}).calendarId,'calendar-a');assert.equal(provider.calls.length,0);
   await assert.rejects(run(async()=>{writableNativeContext();const result=await buildBrainSources(event('Mon agenda'),new Date());pg("UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='calendar' AND revoked_at IS NULL");return result;}));
  }finally{drive.mock.restore();calendar.mock.restore();}
 });
 await t.test('Google reauthentication response does not leak a provider message',async()=>{
  await run(async()=>{
   await nativeGoogleCommand('identity');
   pg(`INSERT INTO clara_connections(id,workspace_id,provider,status,scopes) VALUES('recovery-google','w','google','ACTIVE','[]');INSERT INTO clara_native_google_authority(connection_id,owner_user_id,workspace_id,issuer,subject) VALUES('recovery-google','a','w','https://accounts.google.com','google-a')`);
   writableNativeContext().session.googleConnectionId='recovery-google';
  });
  const mock=t.mock.method(DriveClient.prototype,'create',async()=>{throw new GoogleReauthRequiredError();});
  try{const r=await documentsGET(request());assert.equal(r.status,401);assert.deepEqual(await r.json(),{success:false,code:'GOOGLE_REAUTH_REQUIRED'});}finally{mock.mock.restore();}
 });
 await t.test('mail cognition reads the authorized encrypted cache only; no SMTP/IMAP and revocation fences commit',async()=>{
  seedNativeMailFixture(pg);const provider=new SimulatedMail();
  await run(async()=>{await(await new NativeMail('mail-clara',()=>provider).initialize()).sync('INBOX');});
  let network=0;const transport=t.mock.method(NativeMail.prototype,'transport',async()=>{network++;throw Error('Network forbidden in cached cognition');});
  try{
   const sources=await run(()=>buildBrainSources(event('Mes courriels'),new Date()));const mail=sources.find(source=>source.source==='native-mail')!;
   assert.equal(mail.available,true);assert.match(mail.summary,/Freshness NOT verified/);assert.match(mail.summary,/Isolated incoming email/);assert.match(mail.summary,/clara@melodie\.digital/);assert.equal(network,0);assert.equal(provider.sent.length,0);
   await assert.rejects(run(async()=>{writableNativeContext();const result=await buildBrainSources(event('Mes courriels'),new Date());pg("UPDATE clara_native_mail_authority SET revoked_at=NOW(),revision=revision+1 WHERE connection_id='mail-clara'");return result;}));
   assert.equal(network,0);assert.equal(provider.sent.length,0);
  }finally{transport.mock.restore();}
 });
 await t.test('030 reapplication preserves runtime ACL, data and wrapper identities',async()=>{
  const before=pg("SELECT jsonb_build_object('acl',proacl,'oid',oid) FROM pg_proc WHERE oid='clara_native_runtime_command_pre_mission_contact(text,text,text,text,text,text,jsonb)'::regprocedure");
  const sessionBefore=(await command(scope(sid),'read')).session;
  for(let n=0;n<2;n++)execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/030_native_consultation_threads.sql'),stdio:'pipe'});
  assert.equal(pg("SELECT jsonb_build_object('acl',proacl,'oid',oid) FROM pg_proc WHERE oid='clara_native_runtime_command_pre_mission_contact(text,text,text,text,text,text,jsonb)'::regprocedure"),before);
  assert.deepEqual((await command(scope(sid),'read')).session,sessionBefore);
 });
 await t.test('foreign project and revoked session cannot use these paths',async()=>{
  assert.equal((await documentsGET(request(sid,'p2'))).status,403);
  pg(`UPDATE clara_auth_sessions SET revoked_at=NOW() WHERE token_hash='${googleProofHash('A'.repeat(43))}'`);
  assert.equal((await documentsGET(request())).status,403);
 });
});
