import {createEventJobStore} from '@/lib/external-capabilities/event-jobs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {nativeCommands,withNativeScope,writableNativeContext,nativeMission} from '@/lib/native/scoped-context';
import {nativeChatRequest,nativeChatCommands} from '@/lib/native/chat';
import {Journal} from '@/lib/core/journal';
import {writeActionEntry} from '@/lib/core/journal-writer';
import type {RegistryQuery} from '@/lib/canonical/registry';

test('native conversation: immutable Mission, atomic receipts, durable paginated history and actual concurrent/restart recovery', {skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container='clara-canonical-test-postgres';assert.equal(process.env.CANONICAL_TEST_CONTAINER,container);
 const db='native_browser_'+randomUUID().replaceAll('-','');execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',s],{encoding:'utf8',stdio:'pipe'});
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{const r=await promisify(execFile)('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${statement})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}};
 const command=nativeCommands(query),hash=(v:string)=>createHash('sha256').update(v.repeat(43)).digest('hex');
 const scope=(sid:string,user='A',c='c1',p='p1')=>({digest:hash(user),workspaceId:'w',clientId:c,projectId:p,sessionId:sid});
 const create=async(user='A',c='c1',p='p1')=>String((await command(scope('native:new',user,c,p),'create')).sessionId);
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
 const request=(sid:string,body:unknown,user='A',c='c1',p='p1')=>new Request('https://os.fixture.example/api/clara/chat?'+new URLSearchParams({workspaceId:'w',clientId:c,projectId:p,sessionId:sid}),{method:'POST',headers:{cookie:'clara_auth_session='+user.repeat(43),origin:'https://os.fixture.example','Content-Type':'application/json'},body:JSON.stringify(body)});
 const bind=async(sid:string,title:string,user='A')=>withNativeScope(request(sid,{},user),true,async()=>{const ctx=writableNativeContext();const m={id:'new',title,objective:title,status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};nativeMission(m);ctx.session.mission=m;return m.id;},query);
 const a=await create(),b=await create('B'),p2=await create('A','c1','p2'),p3=await create('A','c2','p3');const ma=await bind(a,'Mission A'),mb=await bind(b,'Mission B','B');
 await t.test('Mission reassignment, foreign user/client/project and unbound historical context fail closed',async()=>{
  await assert.rejects(()=>withNativeScope(request(a,{}),true,async()=>{const ctx=writableNativeContext();const m={...ctx.session.mission!,id:'new',title:'Mission replacement'};nativeMission(m);ctx.session.mission=m;},query));
  assert.equal(((await command(scope(a),'read')).session as {mission:{id:string}}).mission.id,ma);
  for(const bad of [scope(a,'B'),scope(a,'A','c1','p2'),scope(a,'A','c2','p3')])await assert.rejects(()=>command(bad,'history'));
  for(const own of [scope(b,'B'),scope(p2,'A','c1','p2'),scope(p3,'A','c2','p3')])assert.ok(!JSON.stringify(await command(own,'history')).includes(ma));
  const historical=await create();await withNativeScope(request(historical,{}),true,async()=>{writableNativeContext().session.conversation=[{id:'history',role:'user',content:'Unattributed mission history',createdAt:new Date().toISOString()}];},query);
  await assert.rejects(()=>bind(historical,'Do not attribute history'));
  assert.equal(((await command(scope(historical),'history')).messages as {content:string}[])[0].content,'Unattributed mission history');
  assert.notEqual(ma,mb);
 });
 let rendered=0;
 const render=async(message:string)=>{rendered++;const ctx=writableNativeContext();ctx.session.conversation.push({id:randomUUID(),role:'user',content:message,createdAt:new Date().toISOString()},{id:randomUUID(),role:'clara',content:'Prepared only',createdAt:new Date().toISOString()});ctx.session.conversation=ctx.session.conversation.slice(-100);await new Journal().addEntry(writeActionEntry('Chat',message));await new Promise(r=>setTimeout(r,120));return Response.json({success:true,message:'Prepared only',conversation:ctx.session.conversation});};
 await t.test('concurrent identical submissions execute once; lost acknowledgement replays after fresh adapter instantiation',async()=>{
  const op=randomUUID(),body={operationId:op,message:'ACK_LOST'};
  const results=await Promise.all([nativeChatRequest(request(a,body),()=>render('ACK_LOST'),query),nativeChatRequest(request(a,body),()=>render('ACK_LOST'),query)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,202]);assert.equal(rendered,1);
  const after=await command(scope(a),'read');assert.equal((after.journal as unknown[]).length,1);
  const replay=await nativeChatRequest(request(a,body),async()=>{throw Error('MUST NOT REPLAY');},query);assert.equal(replay.status,200);assert.equal(replay.headers.get('X-Clara-Operation-Replayed'),'1');
  const reauthenticated=await nativeChatRequest(request(a,body,'E'),async()=>{throw Error('Fresh canonical session must replay');},query);assert.equal(reauthenticated.status,200);assert.equal(reauthenticated.headers.get('X-Clara-Operation-Replayed'),'1');
  const recovered=JSON.parse(execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-conversation-replay.mts'],{input:JSON.stringify({db,scope:{workspaceId:'w',clientId:'c1',projectId:'p1',sessionId:a},body}),encoding:'utf8',stdio:'pipe'}));assert.deepEqual(recovered,{status:200,replayed:'1',rendered:false});
  assert.equal((await nativeChatCommands(query)(scope(a),'reserve',{operationId:op,message:'ACK_LOST',locale:'fr'})).state,'completed');
  assert.equal(((await command(scope(a),'read')).journal as unknown[]).length,1);assert.equal(rendered,1);
  const receipt=await nativeChatCommands(query)(scope(a),'reserve',{operationId:op,message:'ACK_LOST'});assert.equal(((receipt.result as {journalEntryIds:string[]}).journalEntryIds).length,1);
  assert.equal((await nativeChatRequest(request(a,{...body,message:'Different'}),()=>render('BAD'),query)).status,409);
  assert.equal((await nativeChatRequest(request(b,body,'B'),()=>render('PRIVATE B'),query)).status,200);
  assert.equal((await nativeChatRequest(request(a,body,'B'),()=>render('BAD'),query)).status,403);
  assert.equal((await nativeChatRequest(request(p2,body,'A','c1','p2'),()=>render('BAD'),query)).status,409);
 });
 await t.test('ambiguous abandoned processing pins the Session and never steals/retries ownership',async()=>{
  const sid=await create(),cmd=nativeChatCommands(query),op=randomUUID();await cmd(scope(sid),'reserve',{operationId:op,message:'Unknown outcome'});
  pg(`UPDATE clara_external_event_jobs SET started_at=NOW()-INTERVAL '1 day',expires_at=NOW()-INTERVAL '1 hour' WHERE scope_key='native-chat:${sid}'`);
  const stale=await cmd(scope(sid),'reserve',{operationId:op,message:'Unknown outcome'});assert.equal(stale.state,'pending');
  const other=await cmd(scope(sid),'reserve',{operationId:randomUUID(),message:'New attempt'});assert.equal(other.state,'busy');
 });
 await t.test('more than 100 messages survive in the same store with bounded pages and stable cursors',async()=>{
  const sid=await create();await bind(sid,'History');
  await withNativeScope(request(sid,{}),true,async()=>{writableNativeContext().session.conversation=Array.from({length:100},(_,i)=>({id:'history-'+i,role:i%2?'clara' as const:'user' as const,content:'MESSAGE_'+i,createdAt:new Date().toISOString()}));},query);
  const response=await nativeChatRequest(request(sid,{operationId:randomUUID(),message:'MESSAGE_100'}),()=>render('MESSAGE_100'),query);assert.equal(response.status,200);
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${sid}'`).trim(),'102');
  const latest=await command(scope(sid),'history',{limit:100});assert.equal((latest.messages as unknown[]).length,100);assert.equal(latest.before,'3');
  const earliest=await command(scope(sid),'history',{limit:100,beforeMessageId:(latest.messages as {id:string}[])[0].id});assert.equal((earliest.messages as {id:string}[])[0].id,'history-0');assert.equal((earliest.messages as unknown[]).length,2);assert.equal(earliest.before,null);
  const again=await command(scope(sid),'history',{limit:50});assert.equal((again.messages as unknown[]).length,50);assert.ok(JSON.stringify(again).length<20000);
  const alter=await nativeChatRequest(request(sid,{operationId:randomUUID(),message:'tamper'}),async()=>{writableNativeContext().session.conversation[0].content='ALTERED';return Response.json({success:true});},query);assert.equal(alter.status,409);
 });
 await t.test('revocation at finish rolls back receipt and business state; concurrent context update yields cached conflict',async()=>{
  const sid=await create();await bind(sid,'Before revoke');const op=randomUUID();
  const denied=await nativeChatRequest(request(sid,{operationId:op,message:'Denied at commit'}),async()=>{writableNativeContext().session.conversation.push({id:randomUUID(),role:'user',content:'MUST_NOT_COMMIT',createdAt:new Date().toISOString()});pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE user_id='a' AND project_id='p1'");return Response.json({success:true});},query);assert.equal(denied.status,403);
  pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE user_id='a' AND project_id='p1'");assert.ok(!JSON.stringify(await command(scope(sid),'history')).includes('MUST_NOT_COMMIT'));
  const second=await create();let didRun=0;
  const body={operationId:randomUUID(),message:'CAS conflict'};const changed=await nativeChatRequest(request(second,body),async()=>{didRun++;writableNativeContext().session.conversation.push({id:randomUUID(),role:'user',content:'DISCARDED',createdAt:new Date().toISOString()});await withNativeScope(request(second,{}),true,async()=>{writableNativeContext().session.user.firstName='Explicit simultaneous change';},query);return Response.json({success:true});},query);assert.equal(changed.status,409);
  const replay=await nativeChatRequest(request(second,body),async()=>{didRun++;return Response.json({success:true});},query);assert.equal(replay.status,409);assert.equal(didRun,1);
 });
 await t.test('lost SQL acknowledgement after actual commit replays the same receipt without a second cycle',async()=>{
  const sid=await create();await bind(sid,'SQL acknowledgement');const body={operationId:randomUUID(),message:'SQL_ACK_LOST'};let lost=false,calls=0;
  const losingQuery:RegistryQuery=async(strings,...values)=>{const rows=await query(strings,...values);if(values.includes('finish')&&!lost){lost=true;throw Error('Synthetic acknowledgement loss after commit');}return rows;};
  const first=await nativeChatRequest(request(sid,body),()=>{calls++;return render('SQL_ACK_LOST');},losingQuery);assert.equal(first.status,503);
  const replay=await nativeChatRequest(request(sid,body),async()=>{calls++;throw Error('No replay');},query);assert.equal(replay.status,200);assert.equal(calls,1);
  assert.equal(((await command(scope(sid),'history')).messages as {role:string}[]).filter(m=>m.role==='user').length,1);
 });
 await t.test('generation failure is persisted with its notice and replay never recomposes it',async()=>{
  const sid=await create();await bind(sid,'Failure');const body={operationId:randomUUID(),message:'PROVIDER_FAILURE'};
  const response=await nativeChatRequest(request(sid,body),async()=>{const ctx=writableNativeContext();ctx.commitOnFailure=true;ctx.session.conversation.push({id:randomUUID(),role:'user',content:'PROVIDER_FAILURE',createdAt:new Date().toISOString()},{id:randomUUID(),role:'clara',content:'Provider unavailable',createdAt:new Date().toISOString(),generation:{status:'failed',failureCategory:'provider_server',recoverable:false}});return Response.json({success:false,message:'Provider unavailable'},{status:502});},query);assert.equal(response.status,502);
  assert.equal((await nativeChatRequest(request(sid,body),async()=>{throw Error('MUST NOT RECOMPOSE');},query)).status,502);
  assert.ok(JSON.stringify(await command(scope(sid),'history')).includes('Provider unavailable'));
 });
 await t.test('pre-migration Mission history is preserved read-only, never silently certified',async()=>{
  const sid=await create();await bind(sid,'Old thread');
  pg(`UPDATE clara_sessions SET data=(data-'nativeMissionId')||jsonb_build_object('conversation',jsonb_build_array(jsonb_build_object('id','old-turn','role','user','content','OLD_PRIVATE_A','createdAt',NOW()::text)),'brainDashboard',jsonb_build_object('old','OLD_PRIVATE_A')) WHERE id='${sid}';UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='session' AND resource_id='${sid}' AND revoked_at IS NULL;INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT 'session',id,'a','w','c1','p1',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Explicit synthetic pre-migration snapshot; no production backfill' FROM clara_sessions WHERE id='${sid}'`);
  const data=await command(scope(sid),'read');assert.equal(data.canWrite,false);assert.deepEqual((await command(scope(sid),'history',{beforeMessageId:'old-turn'})).messages,[]);
  await withNativeScope(request(sid,{}),false,async()=>{const ctx=(await import('@/lib/native/scoped-context')).nativeContext()!;assert.equal(ctx.session.brainDashboard,null);assert.equal(ctx.session.recommendation,null);assert.ok(JSON.stringify(ctx.session.conversation).includes('OLD_PRIVATE_A'));},query);await assert.rejects(()=>command(scope(sid),'write'));
  assert.equal((await nativeChatRequest(request(sid,{operationId:randomUUID(),message:'NO_ATTRIBUTION'}),()=>render('BAD'),query)).status,409);
  assert.equal(pg(`SELECT data ? 'nativeMissionId' FROM clara_sessions WHERE id='${sid}'`).trim(),'f');
 });
 await t.test('explicit cancellation fences a delayed owner; an already committed result is never overwritten',async()=>{
  const sid=await create();await bind(sid,'Cancellation');const cmd=nativeChatCommands(query),op=randomUUID();const frozen={operationId:op,message:'Delayed owner',sessionId:sid};
  const owner=await cmd(scope(sid),'reserve',frozen);assert.equal(owner.state,'owned');
  await assert.rejects(()=>cmd(scope(sid),'cancel',{operationId:op,confirm:false}));
  const cancelled=await cmd(scope(sid),'cancel',{operationId:op,confirm:true});assert.equal(((cancelled.result as {body:{code:string}}).body).code,'NATIVE_CHAT_CANCELLED');
  await assert.rejects(()=>cmd(scope(sid),'finish',{jobId:owner.jobId,ownerToken:owner.ownerToken,result:{status:200,body:{success:true}},commit:null}));
  const replay=await nativeChatRequest(request(sid,frozen),async()=>{throw Error('Do not execute cancelled operation');},query);assert.equal(replay.status,409);
  const next={operationId:randomUUID(),message:'Explicit new turn',sessionId:sid};assert.equal((await nativeChatRequest(request(sid,next),()=>render(next.message),query)).status,200);
  const done=await cmd(scope(sid),'cancel',{operationId:next.operationId,confirm:true});assert.equal((done.result as {status:number}).status,200);
  const racingId=randomUUID(),racing=await cmd(scope(sid),'reserve',{operationId:racingId,message:'Race result'}),baseline=await command(scope(sid),'read');
  const original=baseline.session as {conversation:unknown[]};const message={id:randomUUID(),role:'user',content:'RACE_COMMIT',createdAt:new Date().toISOString()};
  const commit={expected:original,session:{...original,conversation:[...original.conversation,message]},missions:[],journal:[],expectedAcquisitions:{},acquisitions:[]};
  const race=await Promise.allSettled([cmd(scope(sid),'finish',{jobId:racing.jobId,ownerToken:racing.ownerToken,result:{status:200,body:{success:true}},commit}),cmd(scope(sid),'cancel',{operationId:racingId,confirm:true})]);
  assert.equal(race[1].status,'fulfilled');const cancellation=(race[1] as PromiseFulfilledResult<Record<string,unknown>>).value.result as {status:number};
  assert.equal(cancellation.status,race[0].status==='fulfilled'?200:409);
  assert.equal(JSON.stringify(await command(scope(sid),'history')).includes('RACE_COMMIT'),race[0].status==='fulfilled');

 });
 await t.test('the existing inbound worker still claims its jobs but never expires native receipts or steals their owners',async()=>{
  const jobQuery:Parameters<typeof createEventJobStore>[0]=async(strings,...values)=>{const statement=strings.reduce((text,part,i)=>text+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');const read=/^\s*SELECT/i.test(statement);const sql=read?`SELECT row_to_json(r) FROM (${statement})r`:`WITH changed AS (${statement}${/\bRETURNING\b/i.test(statement)?'':' RETURNING *'}) SELECT row_to_json(r) FROM changed r`;return pg(sql).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));};
  const store=createEventJobStore(jobQuery);pg("UPDATE clara_external_event_jobs SET expires_at=NOW()-INTERVAL '1 day' WHERE job_kind='native-chat' AND status='completed'");
  await store.maintain();assert.equal(pg("SELECT count(*) FROM clara_external_event_jobs WHERE job_kind='native-chat' AND (status='expired' OR (status='completed' AND result IS NULL))").trim(),'0');
  const id=createHash('sha256').update(randomUUID()).digest('hex');await store.enqueue('external-fixture',id,'clara-live','w',{message:'Existing inbound contract'},randomUUID().replaceAll('-',''));
  const claimed=await store.claim(id);assert.equal(claimed?.status,'processing');assert.equal(claimed?.job_id,id);
  pg(`UPDATE clara_external_event_jobs SET started_at=NOW()-INTERVAL '1 day' WHERE job_id='${id}'`);await store.maintain();assert.equal((await store.lookup('external-fixture',id))?.status,'uncertain');
  assert.equal(pg("SELECT count(*) FROM clara_external_event_jobs WHERE job_kind='native-chat' AND status='uncertain'").trim(),'0');
 });
 await t.test('missing upgraded runtime refuses new writes before entering business code',async()=>{
  const sid=await create();const original=readFileSync('db/migrations/014_native_commercial_continuity.sql','utf8');const start=original.indexOf('CREATE OR REPLACE FUNCTION clara_native_runtime_command('),end=original.indexOf('REVOKE ALL ON FUNCTION clara_native_runtime_command',start);pg(original.slice(start,end));let entered=false;
  try{await assert.rejects(()=>withNativeScope(request(sid,{}),true,async()=>{entered=true;writableNativeContext().session.user.firstName='MUST_NOT_PERSIST';},query),(e:unknown)=>(e as {status?:number}).status===503);assert.equal(entered,false);}
  finally{execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/017_native_conversation_continuity.sql'),stdio:'pipe'});}
 });
 await t.test('migration reapplication and backup/restore preserve receipts, history and invoker security',async()=>{
  const migration=readFileSync('db/migrations/017_native_conversation_continuity.sql');const apply=(name:string)=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',name,'-q','-v','ON_ERROR_STOP=1'],{input:migration,stdio:'pipe'});apply(db);apply(db);
  const restore='native_browser_'+randomUUID().replaceAll('-','');execFileSync('docker',['exec',container,'createdb','-U','postgres',restore]);
  try{const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres',db]);execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',restore,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:'pipe'});apply(restore);const count=execFileSync('docker',['exec',container,'psql','-U','postgres','-d',restore,'-qAt','-c','SELECT count(*) FROM clara_native_conversation_messages'],{encoding:'utf8'});assert.ok(Number(count)>100);}finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',restore]);}
  assert.equal(pg("SELECT bool_and(NOT prosecdef) FROM pg_proc WHERE proname IN ('clara_native_chat_command','clara_native_runtime_command','clara_native_history')").trim(),'t');
 });
});
