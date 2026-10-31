import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {nativeCommands,withNativeScope,nativeContext,nativeMission} from '@/lib/native/scoped-context';
import {nativeChatRequest,cancelNativeChat} from '@/lib/native/chat';
import {googleProofHash} from '@/lib/native/google-authority';
import {loadMissions} from '@/modules/missions/mission-store';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';

test('real chat refuses the review race: secondary mission revoked after read and before finish',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container='clara-canonical-test-postgres';assert.equal(process.env.CANONICAL_TEST_CONTAINER,container);
 const db='native_browser_'+randomUUID().replaceAll('-','');
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
 let revokeAtFinish=false;let secondarySession='';
 const query:RegistryQuery=async(strings,...values)=>{
  if(revokeAtFinish&&values[5]==='finish'){revokeAtFinish=false;pg("UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='mission' AND resource_id=(SELECT data#>>'{mission,id}' FROM clara_sessions WHERE id='"+secondarySession+"') AND revoked_at IS NULL");}
  const s=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');
  assert.ok(/^SELECT clara_native_(runtime|chat)_command\(/.test(s)||s.trimStart().startsWith('WITH native_mission_finalize_input AS MATERIALIZED'),'Only actual scoped SQL primitives and their locked finalization are permitted');
  try{const r=await promisify(execFile)('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${s})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}
  catch(e){throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}
 };
 process.env.CLARA_AUTH_APP_ORIGIN='https://fixture.invalid';
 t.mock.method(globalThis,'fetch',async()=>{throw Error('All external network access is forbidden in this PostgreSQL receipt');});
 const command=nativeCommands(query);
 const scope=(sid:string,u='A',c='c1',p='p1',w='w')=>({digest:googleProofHash(u.repeat(43)),workspaceId:w,clientId:c,projectId:p,sessionId:sid});
 const create=async(u='A',c='c1',p='p1',w='w')=>String((await command(scope('native:new',u,c,p,w),'create')).sessionId);
 const request=(sid:string,body:unknown={},u='A',c='c1',p='p1',w='w')=>new Request('https://fixture.invalid/api/clara/chat',{method:'POST',headers:{origin:'https://fixture.invalid','Content-Type':'application/json',cookie:'clara_auth_session='+u.repeat(43)+'; NEXT_LOCALE=fr; clara_native_selection='+encodeURIComponent(JSON.stringify({workspaceId:w,clientId:c,projectId:p,sessionId:sid}))},body:JSON.stringify(body)});
 const seed=async(title:string,progress:number,u='A',c='c1',p='p1',w='w')=>{
  const sid=await create(u,c,p,w);await withNativeScope(request(sid,{},u,c,p,w),true,async()=>{
   const ctx=nativeContext()!,mission={id:randomUUID(),title,objective:'Confirmed synthetic fixture',progress,status:'active' as const,priority:'medium' as const,tasks:[],createdAt:new Date(),nextAction:'Review only'};
   nativeMission(mission);ctx.session.mission=mission;
  },query);return sid;
 };
 const sid=await seed('Inventorier accès vérifiés',44),second=await seed('Préparer le dossier autorisé',17);
 await seed('PRIVATE_OTHER_OWNER',66,'B');await seed('PRIVATE_OTHER_PROJECT',77,'A','c1','p2');await seed('PRIVATE_OTHER_CLIENT',88,'A','c2','p3');
 secondarySession=second;
 const beforeMissions=pg('SELECT jsonb_agg(jsonb_build_object(\'id\',id,\'data\',data,\'updated_at\',updated_at) ORDER BY id) FROM clara_missions');
 const cockpit=await withNativeScope(request(sid),false,()=>loadMissions(),query);
 assert.equal(cockpit.length,2);assert.equal(cockpit.find(m=>m.title==='Inventorier accès vérifiés')?.progress,44);
 let cookie='';
 const prompts:Array<{phase:string;registry:unknown;contextPresent:boolean}>=[];
 // Only the language provider is simulated. Mission reads, filtering, routes,
 // Brain, canonical authorities, receipts and persistence are the real services.
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async input=>{
  const composer=input.prompt.startsWith('Tu es Clara, la présence conversationnelle');
  const line=input.prompt.split('\n').find(line=>line.startsWith('{"source":"native-missions"'));
  const registry=line?JSON.parse(line):null;
  if(registry)assert.match(input.instructions??'',/untrusted/i,'Business mission values are not instructions');
  prompts.push({phase:composer?'composer':'brain',registry,contextPresent:input.prompt.includes('Projet canonique sélectionné : p1')});
  const content=composer?(registry?registry.missions.map((m:{title:string;progress:number})=>m.title+' — '+m.progress+' %').join('\n')||'Aucune mission autorisée dans ce contexte.':'DIAGNOSTIC SIMULÉ : registre des missions absent du prompt.'):
   JSON.stringify({intent:'Consultation',summary:'Lecture seule des missions',confidence:1,entities:[],actions:[],nextAction:'Consulter',importance:0,urgency:0,impact:0});
  return {success:true,responseStatus:'completed',content};
 });
 const require=createRequire(import.meta.url),exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/clara/chat/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,Response,Request,URL,Date,console,crypto:globalThis.crypto,process,
  require:(name:string)=>name==='@/lib/native/chat'?{nativeChatRequest:(r:Request,render:()=>Promise<Response>)=>nativeChatRequest(r,render,query),cancelNativeChat}:
   name==='next/headers'?{cookies:async()=>({get:(name:string)=>({value:name==='NEXT_LOCALE'?'fr':''}),toString:()=>cookie})}:
   name==='next-intl/server'?{getTranslations:async()=>((key:string)=>key)}:require(name),
 });
 const post=async(r:Request)=>{cookie=r.headers.get('cookie')??'';return (exports.POST as(r:Request)=>Promise<Response>)(r);};
 const body={operationId:randomUUID(),message:'Présente les missions enregistrées dans mon espace.'};
 const response=await post(request(sid,body)),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
 const after=(await command(scope(sid),'read')).session as {mission:unknown;brainDashboard:{context:{metadata:unknown}};sources:Array<{source:string;data:unknown}>};
 if(process.env.MISSION_CONSULTATION_EVIDENCE){mkdirSync(process.env.MISSION_CONSULTATION_EVIDENCE,{recursive:true});writeFileSync(process.env.MISSION_CONSULTATION_EVIDENCE+'/trace.json',JSON.stringify({languageProvider:'SIMULATED; mission registry NOT mocked',cockpit:cockpit.map(({title,progress})=>({title,progress})),modelInputs:prompts,brainContext:after.brainDashboard.context.metadata,response:result.message,missionRowsUnchanged:beforeMissions===pg('SELECT jsonb_agg(jsonb_build_object(\'id\',id,\'data\',data,\'updated_at\',updated_at) ORDER BY id) FROM clara_missions')},null,2));}
 assert.ok(after.sources.some(s=>s.source==='native-missions'),'Cockpit missions are missing from the real Brain sources');
 assert.equal(prompts.length,2);assert.ok(prompts.every(p=>p.registry&&p.contextPresent),'Both reasoning and composer must receive the authorized register and canonical scope');
 assert.match(result.message,/Inventorier accès vérifiés — 44 %/);assert.match(result.message,/Préparer le dossier autorisé — 17 %/);assert.ok(!JSON.stringify(result).includes('PRIVATE_OTHER'));
 assert.deepEqual((after.sources.find(s=>s.source==='native-missions')!.data as {missions:unknown[]}).missions.map(m=>(m as {id:string}).id).sort(),cockpit.map(m=>m.id).sort());
 assert.equal(pg('SELECT jsonb_agg(jsonb_build_object(\'id\',id,\'data\',data,\'updated_at\',updated_at) ORDER BY id) FROM clara_missions'),beforeMissions,'Consultation must not update or create a mission');
 const history=await command(scope(sid),'history');assert.equal((history.messages as unknown[]).length,2);assert.ok(JSON.stringify(history).includes('44 %'));
 revokeAtFinish=true;
 const raced=await post(request(sid,{...body,operationId:randomUUID()}));
 const racedBody=await raced.json();
 console.info('REVIEW_RACE',JSON.stringify({status:raced.status,secondaryMissionRevoked:pg("SELECT count(*) FROM clara_native_resource_authority WHERE resource_kind='mission' AND resource_id=(SELECT data#>>'{mission,id}' FROM clara_sessions WHERE id='"+second+"') AND revoked_at IS NOT NULL"),newMessageIncludesRevokedTitle:typeof racedBody.message==='string'&&racedBody.message.includes('Préparer le dossier autorisé')}));
 assert.equal(raced.status,409,'Revocation after the final read but before finish must reject the response');
});

test('real concurrent PostgreSQL transactions serialize finalization and secondary-mission revocation',{skip:!process.env.CANONICAL_TEST_CONTAINER,timeout:60000},async t=>{
 const container='clara-canonical-test-postgres',db='native_browser_'+randomUUID().replaceAll('-','');
 assert.equal(process.env.CANONICAL_TEST_CONTAINER,container);
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
 const held:Array<ReturnType<typeof session>>=[];
 t.after(async()=>{for(const connection of held){if(connection.child.exitCode===null){connection.child.stdin.end('ROLLBACK;\n\\q\n');await connection.done;}}execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]);});
 const until=async(check:()=>boolean,description:string)=>{const deadline=Date.now()+10000;while(!check()){if(Date.now()>deadline)throw Error('Timed out waiting for '+description);await new Promise(resolve=>setTimeout(resolve,25));}};
 function session(name:string){
  const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1'],{stdio:'pipe'});let output='',error='';
  child.stdout.on('data',part=>{output+=part.toString();});child.stderr.on('data',part=>{error+=part.toString();});
  const done=new Promise<void>((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(error)));});
  // Attach immediately; cleanup still awaits the actual outcome.
  void done.catch(()=>{});
  child.stdin.write("SET application_name='"+name+"';\n");
  return {child,done,send:(s:string)=>child.stdin.write(s+'\n'),marker:(m:string)=>until(()=>output.includes(m),m),commit:async()=>{child.stdin.end('COMMIT;\n\\q\n');await done;}};
 }
 let finalizerName='mission_finalize_initial';
 const query:RegistryQuery=async(strings,...values)=>{
  const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');
  const prefix=statement.trimStart().startsWith('WITH native_mission_finalize_input AS MATERIALIZED')?"SET application_name='"+finalizerName+"';":'';
  try{const r=await promisify(execFile)('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',prefix+`SELECT row_to_json(r) FROM (${statement})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}
  catch(e){throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}
 };
 const command=nativeCommands(query),digest=googleProofHash('A'.repeat(43));
 const scope=(sid:string)=>({digest,workspaceId:'w',clientId:'c1',projectId:'p1',sessionId:sid});
 const create=async()=>String((await command(scope('native:new'),'create')).sessionId);
 const request=(sid:string,op:string)=>new Request('https://fixture.invalid/api/clara/chat?'+new URLSearchParams({workspaceId:'w',clientId:'c1',projectId:'p1',sessionId:sid}),{method:'POST',headers:{origin:'https://fixture.invalid',cookie:'clara_auth_session='+'A'.repeat(43),'Content-Type':'application/json'},body:JSON.stringify({operationId:op,message:'Présente les missions autorisées'})});
 process.env.CLARA_AUTH_APP_ORIGIN='https://fixture.invalid';
 const seed=async(title:string)=>{const sid=await create();let id='';await withNativeScope(request(sid,randomUUID()),true,async()=>{
  const ctx=nativeContext()!,mission={id:randomUUID(),title,objective:'Concurrent synthetic test',status:'active' as const,priority:'medium' as const,progress:44,tasks:[],createdAt:new Date()};nativeMission(mission);id=mission.id;ctx.session.mission=mission;
 },query);return {sid,id};};
 const render=async()=>{
  const {nativeMissionBrainSource}=await import('@/lib/native/cognitive-scope');
  const source=await nativeMissionBrainSource(),data=source.data as {missions:Array<{title:string}>};
  const ctx=(await import('@/lib/native/scoped-context')).writableNativeContext(),message=data.missions.map(m=>m.title).join('\n');
  ctx.session.conversation.push({id:randomUUID(),role:'user',content:'Présente les missions autorisées',createdAt:new Date().toISOString()},{id:randomUUID(),role:'clara',content:message,createdAt:new Date().toISOString()});
  return Response.json({success:true,message});
 };
 const waitOnLock=async(name:string)=>until(()=>pg("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name='"+name+"' AND wait_event_type='Lock'")==='1',name+' blocked on actual PostgreSQL lock');

 await t.test('revocation owns the row first: finalizer waits, then refuses without persisting the new exchange',async()=>{
  const primary=await seed('Primary R'),secondary=await seed('REVOKED_CONCURRENTLY');const op=randomUUID();
  const revoker=session('mission_revoker_first');held.push(revoker);
  revoker.send("BEGIN;UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='mission' AND resource_id='"+secondary.id+"' AND revoked_at IS NULL;\n\\echo REVOCATION_HELD");
  await revoker.marker('REVOCATION_HELD');
  finalizerName='mission_finalize_after_revoker';
  const pending=nativeChatRequest(request(primary.sid,op),render,query);
  await waitOnLock(finalizerName);
  await revoker.commit();
  const result=await pending;assert.equal(result.status,409);assert.ok(!(await result.text()).includes('REVOKED_CONCURRENTLY'));
  assert.equal(pg("SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='"+primary.sid+"'"),'0');
  const replay=await nativeChatRequest(request(primary.sid,op),()=>{throw Error('Failed receipt must not regenerate');},query);assert.equal(replay.status,409);
  console.info('CONCURRENT_REVOCATION_FIRST: actual SQL wait observed; HTTP 409; zero new messages; replay 409');
 });

 await t.test('finalizer owns the read locks first: revocation cannot commit before the message finalization',async()=>{
  const primary=await seed('Primary F'),secondary=await seed('AUTHORIZED_UNTIL_FINALIZATION');const op=randomUUID();
  const locker=session('mission_job_locker');held.push(locker);
  const renderWithJobHeld=async()=>{
   const response=await render();
   locker.send("BEGIN;SELECT job_id FROM clara_external_event_jobs WHERE request->>'operationId'='"+op+"' AND job_kind='native-chat' FOR UPDATE;\n\\echo JOB_HELD");await locker.marker('JOB_HELD');return response;
  };
  finalizerName='mission_finalize_before_revoker';
  const pending=nativeChatRequest(request(primary.sid,op),renderWithJobHeld,query);
  await waitOnLock(finalizerName); // Only the job row is held: read locks were acquired before finish.
  const readerPid=pg("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND application_name='"+finalizerName+"'");assert.match(readerPid,/^\d+$/);
  const revoker=session('mission_revoker_after_reader');held.push(revoker);
  revoker.send("BEGIN;UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='mission' AND resource_id='"+secondary.id+"' AND revoked_at IS NULL;\n\\echo REVOCATION_CAN_COMMIT");
  await waitOnLock('mission_revoker_after_reader');
  assert.equal(pg("SELECT '"+readerPid+"'::int=ANY(pg_blocking_pids(pid)) FROM pg_stat_activity WHERE datname=current_database() AND application_name='mission_revoker_after_reader'"),'t','Revocation must be blocked by the finalization connection');
  await locker.commit();
  const result=await pending;assert.equal(result.status,200);assert.match((await result.json()).message,/AUTHORIZED_UNTIL_FINALIZATION/);
  await revoker.marker('REVOCATION_CAN_COMMIT');await revoker.commit();
  assert.equal(pg("SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='"+primary.sid+"'"),'2');
  const replay=await nativeChatRequest(request(primary.sid,op),()=>{throw Error('No generation on stale replay');},query);assert.equal(replay.status,409);
  assert.equal(pg("SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='"+primary.sid+"'"),'2','Historical finalized exchange remains intact');
  console.info('CONCURRENT_FINALIZATION_FIRST: revoker blocked by finalizer; HTTP 200 committed first; later replay 409; history preserved');
 });
 await t.test('the active mission is protected even outside the 100-entry registry projection',async()=>{
  const sid=await create();
  await withNativeScope(request(sid,randomUUID()),true,async()=>{
   for(let i=0;i<101;i++)nativeMission({id:randomUUID(),title:'Bounded '+i,objective:'Synthetic bound',status:'active',priority:'medium',progress:0,tasks:[],createdAt:new Date()});
  },query);
  await withNativeScope(request(sid,randomUUID()),true,async()=>{
   const ctx=(await import('@/lib/native/scoped-context')).writableNativeContext();
   ctx.session.mission=[...ctx.missions.values()].sort((a,b)=>a.id.localeCompare(b.id)).at(-1)!;
  },query);
  const result=await nativeChatRequest(request(sid,randomUUID()),async()=>{
   const response=await render(),ctx=nativeContext()!,source=ctx.session.mission!;
   assert.equal(ctx.missionReadRows?.length,101);
   assert.ok(ctx.missionReadRows?.some(row=>row.id===source.id));
   return response;
  },query);
  assert.equal(result.status,200);
 });
});
