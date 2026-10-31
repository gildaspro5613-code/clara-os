import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {nativeCommands,withNativeScope,writableNativeContext,nativeMission,nativeContext} from '@/lib/native/scoped-context';
import {NativeGoogleWork,executeGoogleWork,googleWorkCommand,type GoogleWorkInput,normalizeGoogleWorkInput} from '@/lib/native/google-work';
import {nativeGoogleCommand,googleProofHash} from '@/lib/native/google-authority';
import {encryptCredentialPayload} from '@/lib/connections/credential-store';
import {seedGoogleWork,SimulatedGoogleWork,workScopes} from './helpers/native-google-work-fixture';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {createEventJobStore} from '@/lib/external-capabilities/event-jobs';

test('Google native workspace: real PostgreSQL, exact confirmations, immutable scopes, single handoff, recovery and existing stores',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');const db='native_browser_'+randomUUID().replaceAll('-','');execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',s],{encoding:'utf8',stdio:'pipe'});
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{const r=await promisify(execFile)('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',(/^\s*SELECT/.test(statement)?`SELECT row_to_json(r) FROM (${statement})r`:/RETURNING/i.test(statement)?`WITH changed AS (${statement}) SELECT row_to_json(changed) FROM changed`:statement)]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){const err=String((e as {stderr:unknown}).stderr);throw {code:err.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1],detail:err.split('\n')[0]};}};
 const command=nativeCommands(query),digest=(u:string)=>createHash('sha256').update(u.repeat(43)).digest('hex');
 const create=async(u='A',c='c1',p='p1')=>String((await command({digest:digest(u),workspaceId:'w',clientId:c,projectId:p,sessionId:'native:new'},'create')).sessionId);
 const a=await create(),b=await create('B'),p2=await create('A','c1','p2'),p3=await create('A','c2','p3');process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');seedGoogleWork(pg);
 const request=(u='A',s=a,c='c1',p='p1')=>new Request('https://os.fixture.example/api?'+new URLSearchParams({workspaceId:'w',clientId:c,projectId:p,sessionId:s}),{headers:{origin:'https://os.fixture.example',cookie:'clara_auth_session='+u.repeat(43)}});
 const run=<T>(fn:()=>Promise<T>,r=request(),write=false)=>withNativeScope(r,write,fn,query);
 const provider=new SimulatedGoogleWork(),work=async()=>new NativeGoogleWork('google-work-a',provider.factory).initialize();
 for(const r of [request(),request('B',b),request('A',p2,'c1','p2'),request('A',p3,'c2','p3')])await run(async()=>{const ctx=writableNativeContext(),mission={id:'new',title:'Google authorized Mission',objective:'Only explicitly approved Google operations',createdAt:new Date(),status:'planned' as const,priority:'medium' as const,tasks:[],progress:0};nativeMission(mission);ctx.session.mission=mission;},r,true);
 const prepare=(i:GoogleWorkInput)=>run(async()=>await(await work()).prepare(i));
 const execute=(id:string,hash:string,confirm=true,r=request())=>executeGoogleWork(r,'google-work-a',id,hash,confirm,provider.factory,query);
 const reconcile=(id:string,r=request())=>executeGoogleWork(r,'google-work-a',id,'',false,provider.factory,query,true);
 const input=(kind:GoogleWorkInput['kind'],extra:Partial<GoogleWorkInput>={})=>({operationId:randomUUID(),kind,resourceId:kind.startsWith('calendar.')?'calendar-a':'folder-a',name:'Isolated approved resource',...(kind.startsWith('calendar.')?{start:new Date(Date.now()+3600000).toISOString(),end:new Date(Date.now()+7200000).toISOString(),description:'No attendees or invitations'}:{content:Buffer.from('DURABLE_APPROVED_CONTENT').toString('base64'),mimeType:'text/plain'}),...extra});
 await t.test('consent transactions retain actual grants and reject missing or partial scopes',async()=>{
  const stateHash=googleProofHash(randomUUID()),nonceHash=googleProofHash(randomUUID());
  await run(()=>nativeGoogleCommand('begin',{connectionId:'google-work-a',stateHash,nonceHash,requestedScopes:workScopes}));
  const payload={connectionId:'google-work-a',stateHash,nonceHash,issuer:'https://accounts.google.com',subject:'google-a',encryptedPayload:encryptCredentialPayload({accessToken:'synthetic-google-a',refreshToken:'synthetic-refresh-google-a',scope:workScopes},Buffer.alloc(32,9))};
  await assert.rejects(()=>run(()=>nativeGoogleCommand('finish',payload)));await assert.rejects(()=>run(()=>nativeGoogleCommand('finish',{...payload,grantedScopes:['openid']})));
  await run(()=>nativeGoogleCommand('finish',{...payload,grantedScopes:workScopes}));assert.deepEqual(JSON.parse(pg("SELECT scopes FROM clara_connections WHERE id='google-work-a'")),workScopes);
  provider.files.get('folder-a')!.isAppAuthorized=false;await assert.rejects(()=>run(async()=>await(await work()).inspect('folder','folder-a')));
  for(const scopes of [[...workScopes.filter(s=>s!=='https://www.googleapis.com/auth/drive.file'),'https://www.googleapis.com/auth/drive'],workScopes]){const stateHash=googleProofHash(randomUUID()),nonceHash=googleProofHash(randomUUID());await run(()=>nativeGoogleCommand('begin',{connectionId:'google-work-a',stateHash,nonceHash,requestedScopes:scopes}));await run(()=>nativeGoogleCommand('finish',{...payload,stateHash,nonceHash,grantedScopes:scopes,encryptedPayload:encryptCredentialPayload({accessToken:'synthetic-google-a',refreshToken:'synthetic-refresh-google-a',scope:scopes},Buffer.alloc(32,9))}));if(scopes.includes('https://www.googleapis.com/auth/drive'))assert.equal((await run(async()=>await(await work()).inspect('folder','folder-a'))).resource.id,'folder-a');}
  provider.files.get('folder-a')!.isAppAuthorized=true;

 });
 await t.test('explicit resource binding, two users/clients/projects and historical/primary/root refusals',async()=>{
  for(const [kind,id] of [['calendar','calendar-a'],['folder','folder-a'],['folder','folder-other']] as const){const check=await run(async()=>await(await work()).inspect(kind,id));await run(async()=>await(await work()).bind(kind,id,check.resource.version!),request(),true);}
  for(const r of [request('B',b),request('A',p2,'c1','p2'),request('A',p3,'c2','p3')]){
   await assert.rejects(()=>run(async()=>await(await work()).bind('folder','folder-a','1'),r,true));
  }
  for(const id of ['primary',''])await assert.rejects(()=>run(async()=>await(await work()).inspect('calendar',id)));
  await assert.rejects(()=>run(async()=>await(await work()).inspect('folder','root')));
  for(const r of [new Request('https://os.fixture.example'),request('invalid'),request('D')])await assert.rejects(()=>run(()=>work(),r));
  provider.principal='google-b';await assert.rejects(()=>prepare(input('drive.create')));provider.principal='google-a';
 });
 let file='';
 await t.test('prepared encrypted file, exact human confirmation and concurrent one-time execution/replay',async()=>{
  const i=input('drive.create'),review=await prepare(i);assert.equal(provider.calls.length,0);const again=await prepare(i);assert.equal(again.operationId,review.operationId);assert.equal(provider.generated,1);assert.equal(review.proposal.sha256,createHash('sha256').update('DURABLE_APPROVED_CONTENT').digest('hex'));await assert.rejects(()=>prepare({...i,name:'Different content'}));
  await assert.rejects(()=>execute(i.operationId,review.reviewHash,false));await assert.rejects(()=>execute(i.operationId,'wrong-hash'));
  const replies=await Promise.allSettled([execute(i.operationId,review.reviewHash),execute(i.operationId,review.reviewHash)]);assert.ok(replies.some(r=>r.status==='fulfilled'&&r.value.status==='completed'));assert.equal(provider.calls.length,1);
  const replay=await execute(i.operationId,review.reviewHash);assert.equal(replay.status,'completed');assert.equal(provider.calls.length,1);file=(replay.result as {id:string}).id;

  const cancelled=await prepare(input('calendar.create',{name:'Human cancelled before handoff'}));await run(()=>googleWorkCommand('cancel',{connectionId:'google-work-a',operationId:cancelled.operationId}),request(),true);assert.equal((await execute(cancelled.operationId,cancelled.reviewHash)).status,'failed');assert.equal(provider.calls.length,1);await assert.rejects(()=>run(()=>googleWorkCommand('cancel',{connectionId:'google-work-a',operationId:i.operationId}),request(),true));
  assert.equal(pg('SELECT COUNT(*) FROM clara_tool_approvals').trim(),'1');assert.equal(pg("SELECT COUNT(*) FROM clara_external_event_jobs WHERE job_kind='native-google' AND status='completed'").trim(),'1');
  assert.ok(!pg("SELECT request::text FROM clara_external_event_jobs WHERE job_kind='native-google'").includes('DURABLE_APPROVED_CONTENT'));
  const data=await run(async()=>nativeContext()!.session.mission);assert.ok(data?.googleOperations?.some(r=>r.resourceId===file));assert.ok((await run(async()=>await(await work()).resources())).resources.some(r=>r.id===file));
 });
 await t.test('lost provider acknowledgement, read-only reconciliation, fresh service/reconnect and no automatic resend',async()=>{
  provider.outcome='lost-ack';const i=input('calendar.create'),r=await prepare(i);const result=await execute(i.operationId,r.reviewHash);assert.equal(result.status,'uncertain');const before=provider.calls.length;const retry=await execute(i.operationId,r.reviewHash);assert.equal(retry.status,'uncertain');assert.equal(provider.calls.length,before);
  const recovered=await reconcile(i.operationId);assert.equal(recovered.status,'completed');assert.equal(provider.calls.length,before);
  provider.outcome='ok';assert.ok((await run(async()=>await(await work()).events())).events.some(e=>e.summary===i.name));
 });
 await t.test('conditional calendar update and Drive content/move preserve IDs, metadata, rights and versions',async()=>{
  const current=[...provider.events.values()][0];const eventId=String(current.id);const event=await prepare(input('calendar.update',{eventId,name:'Updated appointment'}));assert.equal((await execute(event.operationId,event.reviewHash)).status,'completed');assert.equal(provider.events.get('calendar-a/'+eventId)?.summary,'Updated appointment');
  const update=await prepare(input('drive.update',{fileId:file,name:'Updated text',content:Buffer.from('UPDATED_BYTES').toString('base64')}));assert.equal((await execute(update.operationId,update.reviewHash)).status,'completed');assert.equal(provider.files.get(file)!.content.toString(),'UPDATED_BYTES');
  const move=await prepare(input('drive.move',{resourceId:'folder-other',fileId:file,name:'Classified text',content:undefined,mimeType:undefined}));assert.equal((await execute(move.operationId,move.reviewHash)).status,'completed');assert.deepEqual(provider.files.get(file)!.parents,['folder-other']);
  const stale=await prepare(input('drive.move',{resourceId:'folder-a',fileId:file,name:'Must not overwrite',content:undefined,mimeType:undefined}));provider.files.get(file)!.etag='"foreign-version"';const before=provider.calls.length;await assert.rejects(()=>execute(stale.operationId,stale.reviewHash));assert.equal(provider.calls.length,before);
  const racing=await prepare(input('drive.update',{resourceId:'folder-other',fileId:file,name:'Approved text remains classified',content:Buffer.from('RACE_SAFE_CONTENT').toString('base64')}));provider.onMutation=()=>{provider.files.get(file)!.parents=['folder-a'];};assert.equal((await execute(racing.operationId,racing.reviewHash)).status,'uncertain');provider.onMutation=undefined;const handoffs=provider.calls.length;assert.equal((await reconcile(racing.operationId)).status,'uncertain');provider.files.get(file)!.parents=['folder-other'];assert.equal((await reconcile(racing.operationId)).status,'completed');assert.equal(provider.calls.length,handoffs);
  const overlap=await prepare(input('drive.update',{resourceId:'folder-other',fileId:file,name:'Concurrent receipt finalization',content:Buffer.from('ONE_CANONICAL_RECEIPT').toString('base64')}));let reconciledResult:unknown;provider.afterMutation=async()=>{provider.afterMutation=undefined;const done=await reconcile(overlap.operationId);assert.equal(done.status,'completed');reconciledResult=done.result;};const ownerResult=await execute(overlap.operationId,overlap.reviewHash);assert.equal(ownerResult.status,'completed');assert.deepEqual(ownerResult.result,reconciledResult);assert.equal(provider.calls.filter(p=>p.input.operationId===overlap.operationId).length,1);assert.equal(pg(`SELECT COUNT(*) FROM clara_journal_entries WHERE entry->>'summary'='GOOGLE_WRITE_COMPLETED' AND (entry->>'details')::jsonb->>'operationId'='${overlap.operationId}'`).trim(),'1');assert.equal(pg(`SELECT COUNT(*) FROM clara_external_event_jobs WHERE request->>'operationId'='${overlap.operationId}' AND status='completed'`).trim(),'1');


 });
 await t.test('project and Google resource revocation, read-only delegations, expired consent/proposals',async()=>{
  provider.calendars.get('calendar-a')!.accessRole='reader';assert.ok((await run(async()=>await(await work()).events())).events.length>0);await assert.rejects(()=>prepare(input('calendar.create')));provider.calendars.get('calendar-a')!.accessRole='owner';
  const event=[...provider.events.values()][0],eventId=String(event.id);for(const extra of [{attendees:[{email:'synthetic@example.invalid'}]},{recurrence:['RRULE:FREQ=DAILY']},{recurringEventId:'series-id'},{status:'cancelled'}]){Object.assign(event,extra);await assert.rejects(()=>prepare(input('calendar.update',{eventId})));for(const key of Object.keys(extra))delete event[key];}
  const i=input('calendar.create'),r=await prepare(i),before=provider.calls.length;
  pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE user_id='a' AND project_id='p1'");await assert.rejects(()=>execute(i.operationId,r.reviewHash));pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE user_id='a' AND project_id='p1'");
  provider.deny=true;await assert.rejects(()=>execute(i.operationId,r.reviewHash));provider.deny=false;assert.equal(provider.calls.length,before);
  pg("UPDATE clara_connections SET scopes='[\"openid\",\"https://www.googleapis.com/auth/drive.readonly\"]' WHERE id='google-work-a'");await assert.rejects(()=>execute(i.operationId,r.reviewHash));pg(`UPDATE clara_connections SET scopes='${JSON.stringify(['openid','https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/drive.readonly','https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events'])}' WHERE id='google-work-a'`);
  pg(`UPDATE clara_external_event_jobs SET expires_at=NOW()-INTERVAL '1 minute' WHERE request->>'operationId'='${i.operationId}'`);await assert.rejects(()=>execute(i.operationId,r.reviewHash));assert.equal(provider.calls.length,before);
 });
 await t.test('read delegation never becomes write authority; second owner retains independent mailbox/project resources',async()=>{
  await run(()=>nativeGoogleCommand('delegate',{connectionId:'google-work-a',userId:'b'}));
  await run(async()=>await(await work()).select('calendar','calendar-a'),request('B',b),true);
  assert.ok((await run(async()=>await(await work()).events(),request('B',b))).events.length>0);
  const calls=provider.calls.length;await assert.rejects(()=>run(async()=>await(await work()).prepare(input('calendar.create')),request('B',b)));assert.equal(provider.calls.length,calls);
  await run(()=>nativeGoogleCommand('revokeDelegation',{connectionId:'google-work-a',userId:'b'}));await assert.rejects(()=>run(async()=>await(await work()).events(),request('B',b)));
  const second=new SimulatedGoogleWork();second.principal='google-b';second.generated=100;second.folder('folder-b');const own=async()=>new NativeGoogleWork('google-work-b',second.factory).initialize();
  const capabilities=await run(async()=>await(await own()).capabilities(),request('B',b));assert.equal(capabilities.canConsent,false);assert.equal(capabilities.canManage,true);
  const folder=await run(async()=>await(await own()).inspect('folder','folder-b'),request('B',b));await run(async()=>await(await own()).bind('folder','folder-b',folder.resource.version!),request('B',b),true);
  const i=input('drive.upload',{resourceId:'folder-b',name:'Independent B file'});const r=await run(async()=>await(await own()).prepare(i),request('B',b));assert.equal((await executeGoogleWork(request('B',b),'google-work-b',i.operationId,r.reviewHash,true,second.factory,query)).status,'completed');assert.equal(second.calls.length,1);
  await assert.rejects(()=>run(async()=>new NativeGoogleWork('google-work-b',second.factory).initialize()));
 });
 await t.test('single HTTP handoff never retries errors; explicit precondition and refusal receipt release scope',async()=>{
  const rawFactory=async()=>{const clients=provider.clients();delete clients.mutate;return clients;};
  const r=await prepare(input('calendar.create',{name:'Definitive provider refusal'}));
  let calls=0;
  const mock=t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{calls++;assert.equal(options.redirect,'error');assert.ok(options.signal);assert.ok(String(_url).includes('sendUpdates=none'));const body=JSON.parse(String(options.body));assert.deepEqual(body.attendees,[]);return new Response(null,{status:412});});
  try{assert.equal((await executeGoogleWork(request(),'google-work-a',r.operationId,r.reviewHash,true,rawFactory,query)).status,'failed');assert.equal(calls,1);assert.equal((await execute(r.operationId,r.reviewHash)).status,'failed');assert.equal(calls,1);}finally{mock.mock.restore();}
  provider.outcome='refuse';const next=await prepare(input('calendar.create'));assert.equal((await execute(next.operationId,next.reviewHash)).status,'failed');provider.outcome='ok';
  const receipt=await prepare(input('calendar.create'));assert.equal((await execute(receipt.operationId,receipt.reviewHash)).status,'completed');
  const before=provider.calls.length;pg("UPDATE clara_connections SET status='RECONNECT_REQUIRED' WHERE id='google-work-a'");provider.deny=true;
  assert.equal((await run(async()=>await(await new NativeGoogleWork('google-work-a',provider.factory).initialize(false)).review(receipt.operationId))).status,'completed');
  assert.equal((await execute(receipt.operationId,receipt.reviewHash)).status,'completed');assert.equal(provider.calls.length,before);
  provider.deny=false;pg("UPDATE clara_connections SET status='ACTIVE' WHERE id='google-work-a'");
  const created=await prepare(input('drive.create',{name:'Persisted plain text creation',content:Buffer.from('CREATED_TEXT_BYTES').toString('base64')}));const completed=await execute(created.operationId,created.reviewHash);assert.equal(completed.status,'completed');assert.equal(provider.files.get((completed.result as {id:string}).id)!.content.toString(),'CREATED_TEXT_BYTES');
 });
 await t.test('uncertain no-effect blocks new handoffs and inbound maintenance cannot consume or expire native Google receipts',async()=>{
  provider.outcome='no-effect';const r=await prepare(input('calendar.create'));assert.equal((await execute(r.operationId,r.reviewHash)).status,'uncertain');const calls=provider.calls.length;assert.equal((await reconcile(r.operationId)).status,'uncertain');assert.equal(provider.calls.length,calls);
  const next=await prepare(input('calendar.create',{name:'Blocked behind uncertainty'}));await assert.rejects(()=>execute(next.operationId,next.reviewHash));assert.equal(provider.calls.length,calls);
  pg("UPDATE clara_external_event_jobs SET expires_at=NOW()-INTERVAL '1 day',started_at=NOW()-INTERVAL '1 day' WHERE job_kind='native-google'");const store=createEventJobStore(query as never);await store.maintain();assert.equal(pg("SELECT COUNT(*) FROM clara_external_event_jobs WHERE job_kind='native-google' AND status='expired'").trim(),'0');assert.equal(await store.claim(),null);
 });
 await t.test('020 additive reapplication and pg_dump restoration preserve every operation/attestation/receipt',async()=>{
  const fingerprint=(database:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',database,'-qAt','-c',"SELECT md5(string_agg(x::text,'' ORDER BY x::text)) FROM (SELECT to_jsonb(j) x FROM clara_external_event_jobs j UNION ALL SELECT to_jsonb(a) FROM clara_native_resource_authority a UNION ALL SELECT to_jsonb(m) FROM clara_missions m UNION ALL SELECT to_jsonb(j) FROM clara_journal_entries j UNION ALL SELECT to_jsonb(a) FROM clara_tool_approvals a)r"],{encoding:'utf8'}).trim();
  const before=fingerprint(db),restore=db+'_restore';execFileSync('docker',['exec',container,'createdb','-U','postgres',restore]);try{const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres',db]);execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',restore,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:'pipe'});for(const target of [db,restore])for(let i=0;i<2;i++)execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',target,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/020_native_google_workspace.sql'),stdio:'pipe'});assert.equal(fingerprint(db),before);assert.equal(fingerprint(restore),before);}finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',restore]);}
 });
});

test('Google import validation rejects oversized bodies, ambiguous identities, native document conversion and offset-less times',()=>{
 const base={operationId:randomUUID(),kind:'drive.upload' as const,resourceId:'folder-a',name:'test',content:Buffer.from('test').toString('base64'),mimeType:'text/plain'};
 assert.throws(()=>normalizeGoogleWorkInput({...base,content:Buffer.alloc(2*1024*1024+1).toString('base64')}));assert.throws(()=>normalizeGoogleWorkInput({...base,mimeType:'application/vnd.google-apps.document'}));assert.throws(()=>normalizeGoogleWorkInput({...base,kind:'calendar.create',resourceId:'primary'}));assert.throws(()=>normalizeGoogleWorkInput({...base,kind:'calendar.create',resourceId:'calendar-a',start:'2026-10-16T12:00',end:'2026-10-16T13:00'}));
});
