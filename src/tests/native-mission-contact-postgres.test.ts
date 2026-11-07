import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {nativeCommands,withNativeScope,writableNativeContext,nativeMission} from '@/lib/native/scoped-context';
import {associateNativeMissionContact} from '@/lib/native/mission-contact';
import {saveNativeContact} from '@/lib/native/contacts';
import type {RegistryQuery} from '@/lib/canonical/registry';

test('mission contact: real PostgreSQL business association, immutable conversation, CAS and revoke',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 assert.equal(process.env.CANONICAL_TEST_CONTAINER,'clara-canonical-test-postgres');const db='native_browser_'+randomUUID().replaceAll('-',''),container='clara-canonical-test-postgres';
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const args=['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'];
 const pg=(q:string)=>execFileSync('docker',[...args,'-c',q],{encoding:'utf8',stdio:'pipe'}).trim();
 const query:RegistryQuery=async(strings,...values)=>{const q=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{const r=await promisify(execFile)('docker',[...args,'-c',`SELECT row_to_json(r) FROM (${q})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){console.error(String((e as {stderr:unknown}).stderr).split('\n')[0]);throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}};
 const digest=createHash('sha256').update('A'.repeat(43)).digest('hex'),command=nativeCommands(query);
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
 const request=(s:string,user='A',c='c1',p='p1')=>new Request('https://os.fixture.example/api?'+new URLSearchParams({workspaceId:'w',clientId:c,projectId:p,sessionId:s}),{headers:{cookie:'clara_auth_session='+user.repeat(43),origin:'https://os.fixture.example'}});
 const run=<T>(s:string,f:()=>Promise<T>)=>withNativeScope(request(s),true,f,query);
 const create=async()=>{const s=String((await command({digest,workspaceId:'w',clientId:'c1',projectId:'p1',sessionId:'native:new'},'create')).sessionId);await run(s,async()=>{const ctx=writableNativeContext();const m={id:'new',title:'Mission before contact',objective:'Existing canonical mission',status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};nativeMission(m);ctx.session.mission=m;});return s;};
 const read=(s:string)=>JSON.parse(pg(`SELECT data FROM clara_sessions WHERE id='${s}'`));
 const associate=(s:string,id='prospect-a')=>run(s,async()=>associateNativeMissionContact(writableNativeContext().session.mission!.id,id));
 const events=(s:string)=>pg(`SELECT count(*) FROM clara_native_journal_scope WHERE session_id='${s}'`);
 await t.test('mission first: explicit association activates an empty context, same IDs, one durable event and replay after fresh adapter',async()=>{
  const s=await create(),before=read(s);const alias=String((await command({digest,workspaceId:'w',clientId:'c1',projectId:'p1',sessionId:'native:new'},'create')).sessionId);await run(alias,async()=>{writableNativeContext().session.mission=before.mission;});assert.equal((await associate(s)).requiresNewSession,false);const after=read(s);assert.equal(after.mission.id,before.mission.id);assert.equal(after.nativeMissionId,before.nativeMissionId);assert.equal(after.acquisitionSubmissionId,'prospect-a');assert.equal(after.mission.acquisitionSubmissionId,'prospect-a');assert.equal(events(s),'1');
  await associate(s);assert.equal(events(s),'1');assert.deepEqual(read(s).conversation,before.conversation);assert.equal(read(alias).acquisitionSubmissionId,undefined);assert.equal((await associate(alias)).requiresNewSession,true);assert.equal(read(alias).acquisitionSubmissionId,undefined);assert.equal(events(alias),'0');
 });
 await t.test('existing turns: business link only; old history, active context, Brain and receipts stay unchanged',async()=>{
  const s=await create();await run(s,async()=>{const ctx=writableNativeContext();ctx.session.conversation=[{id:'old-'+randomUUID(),role:'user',content:'Before any contact',createdAt:new Date()}];});
  const before=read(s),messages=pg(`SELECT json_agg(message ORDER BY ordinal) FROM clara_native_conversation_messages WHERE session_id='${s}'`);
  assert.equal((await associate(s)).requiresNewSession,true);const after=read(s);assert.equal(after.acquisitionSubmissionId,undefined);assert.equal(after.mission.acquisitionSubmissionId,'prospect-a');assert.equal(after.mission.id,before.mission.id);assert.deepEqual(after.conversation,before.conversation);assert.deepEqual(after.brainDashboard,before.brainDashboard);assert.equal(pg(`SELECT json_agg(message ORDER BY ordinal) FROM clara_native_conversation_messages WHERE session_id='${s}'`),messages);
  await associate(s);assert.equal(events(s),'1');
 });
 await t.test('foreign owner/client/project, unbound history, foreign session and replacing an existing contact are refused',async()=>{
  const s=await create();for(const id of ['prospect-b','prospect-p2','prospect-p3','unbound-history'])await assert.rejects(associate(s,id),{status:403});
  await assert.rejects(withNativeScope(request(s,'B'),true,async()=>associateNativeMissionContact(read(s).mission.id,'prospect-b'),query),{status:403});
  await associate(s);await assert.rejects(associate(s,'prospect-p2'),{status:403});assert.equal(events(s),'1');
 });
 const contactSession=await create();const contact=await run(contactSession,async()=>saveNativeContact({action:'create',name:'Second authorized contact',email:'other@example.invalid',locale:'en'}));
 await t.test('genuine concurrent different contacts: one commit, one CAS conflict, no overwritten association',async()=>{
  const s=await create();let entered=0,release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
  const update=(id:string)=>run(s,async()=>{await associateNativeMissionContact(writableNativeContext().session.mission!.id,id);if(++entered===2)release();await gate;});
  const results=await Promise.allSettled([update('prospect-a'),update(contact.submissionId!)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((results.find(x=>x.status==='rejected') as PromiseRejectedResult).reason.status,409);assert.equal(events(s),'1');
  const other=read(s).acquisitionSubmissionId==='prospect-a'?contact.submissionId!:'prospect-a';await assert.rejects(associate(s,other),{status:409});
 });
 await t.test('identical concurrent requests and lost-ack replay never duplicate the association event',async()=>{
  const s=await create();const outcomes=await Promise.allSettled([associate(s),associate(s)]);assert.ok(outcomes.some(r=>r.status==='fulfilled'));for(const r of outcomes)if(r.status==='rejected')assert.equal(r.reason.status,409);await associate(s);assert.equal(events(s),'1');
 });
 await t.test('contact revoked after preparation rolls back business link, session activation and audit together',async()=>{
  const s=await create(),before=read(s);
  try{await assert.rejects(run(s,async()=>{await associateNativeMissionContact(writableNativeContext().session.mission!.id,'prospect-a');pg("UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='acquisition' AND resource_id='w/prospect-a' AND revoked_at IS NULL");}),{status:403});assert.deepEqual(read(s),before);assert.equal(events(s),'0');}finally{pg("INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,'New explicit synthetic attestation after revocation test' FROM clara_native_resource_authority WHERE resource_kind='acquisition' AND resource_id='w/prospect-a' LIMIT 1");}
 });
 await t.test('SQL refuses a missing association proof or a forged active context on historical conversation',async()=>{
  const s=await create();await run(s,async()=>{writableNativeContext().session.conversation=[{id:'historic-'+randomUUID(),role:'user',content:'Immutable original',createdAt:new Date()}];});
  await assert.rejects(run(s,async()=>{const ctx=writableNativeContext(),m={...ctx.session.mission!,acquisitionSubmissionId:'prospect-a'};nativeMission(m);ctx.session.mission=m;ctx.session.acquisitionSubmissionId='prospect-a';}),{status:409});
  await assert.rejects(run(s,async()=>{await associateNativeMissionContact(writableNativeContext().session.mission!.id,'prospect-a');writableNativeContext().session.acquisitionSubmissionId='prospect-a';}),{status:409});assert.equal(read(s).mission.acquisitionSubmissionId,undefined);
 });
 await t.test('migration preserves explicit runtime EXECUTE authority without granting PUBLIC or ownership',async()=>{
  const role='mission_contact_'+randomUUID().replaceAll('-','');pg(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;GRANT EXECUTE ON FUNCTION clara_native_runtime_command_pre_mission_contact(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO ${role}`);
  try{execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/025_native_mission_contact_association.sql'),stdio:'pipe'});assert.equal(pg(`SELECT has_function_privilege('${role}','clara_native_runtime_command(text,text,text,text,text,text,jsonb)','EXECUTE')`),'t');assert.equal(pg(`SELECT has_function_privilege('public','clara_native_runtime_command(text,text,text,text,text,text,jsonb)','EXECUTE')`),'f');}finally{pg(`DROP OWNED BY ${role};DROP ROLE ${role}`);}
 });
 await t.test('migration reapplication preserves the existing runtime and persisted association',async()=>{
  const s=await create();await associate(s);const before=read(s);for(let n=0;n<2;n++)execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/025_native_mission_contact_association.sql'),stdio:'pipe'});await associate(s);assert.equal(read(s).mission.id,before.mission.id);assert.equal(events(s),'1');
 });
});
