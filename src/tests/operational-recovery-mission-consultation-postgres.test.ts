import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
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
import {nativeMissionBrainSource,verifyNativeMissionReadProof} from '@/lib/native/cognitive-scope';
import {loadMissions} from '@/modules/missions/mission-store';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';

test('actual chat → Brain → authorized PostgreSQL mission registry → composer → durable history, never mission mutation',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container='clara-canonical-test-postgres';assert.equal(process.env.CANONICAL_TEST_CONTAINER,container);
 const db='native_browser_'+randomUUID().replaceAll('-','');
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
 const query:RegistryQuery=async(strings,...values)=>{
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
 const bSid=await seed('PRIVATE_OTHER_OWNER',66,'B');await seed('PRIVATE_OTHER_PROJECT',77,'A','c1','p2');await seed('PRIVATE_OTHER_CLIENT',88,'A','c2','p3');
 const beforeMissions=pg('SELECT jsonb_agg(jsonb_build_object(\'id\',id,\'data\',data,\'updated_at\',updated_at) ORDER BY id) FROM clara_missions');
 const cockpit=await withNativeScope(request(sid),false,()=>loadMissions(),query);
 assert.equal(cockpit.length,2);assert.equal(cockpit.find(m=>m.title==='Inventorier accès vérifiés')?.progress,44);
 let cookie='',modelCalls=0,revokeDuringComposition=false;
 const prompts:Array<{phase:string;registry:unknown;contextPresent:boolean}>=[];
 // Only the language provider is simulated. Mission reads, filtering, routes,
 // Brain, canonical authorities, receipts and persistence are the real services.
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async input=>{
  modelCalls++;const composer=input.prompt.startsWith('Tu es Clara, la présence conversationnelle');
  const line=input.prompt.split('\n').find(line=>line.startsWith('{"source":"native-missions"'));
  const registry=line?JSON.parse(line):null;
  if(registry)assert.match(input.instructions??'',/untrusted/i,'Business mission values are not instructions');
  prompts.push({phase:composer?'composer':'brain',registry,contextPresent:input.prompt.includes('Projet canonique sélectionné : p1')});
  if(composer&&revokeDuringComposition)pg("UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='mission' AND resource_id=(SELECT data#>>'{mission,id}' FROM clara_sessions WHERE id='"+second+"') AND revoked_at IS NULL");
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
 const calls=modelCalls;
 const forged=await post(request(sid,{...body,operationId:randomUUID(),missionReads:[]}));assert.equal(forged.status,400,'The browser cannot supply or clear server-owned mission read proofs');assert.equal(modelCalls,calls);
 const replay=await post(request(sid,body));assert.equal(replay.status,200);assert.equal(replay.headers.get('X-Clara-Operation-Replayed'),'1');assert.deepEqual(await replay.json(),result);assert.equal(modelCalls,calls);
 for(const r of [request(sid,{...body,operationId:randomUUID()},'B'),request(sid,{...body,operationId:randomUUID()},'A','c1','p2'),request(sid,{...body,operationId:randomUUID()},'A','c2','p3'),request(sid,{...body,operationId:randomUUID()},'D'),request(sid,{...body,operationId:randomUUID()},'A','c1','p1','other-workspace')])assert.equal((await post(r)).status,403);
 assert.equal(modelCalls,calls);
 for(const value of ['', 'clara_auth_session=invalid']){const r=request(sid,{...body,operationId:randomUUID()});r.headers.set('cookie',value);assert.equal((await post(r)).status,401);}
 assert.equal(modelCalls,calls);
 const ownerB=await post(request(bSid,{...body,operationId:randomUUID()},'B'));assert.equal(ownerB.status,200);const ownerBBody=await ownerB.json();assert.match(ownerBBody.message,/PRIVATE_OTHER_OWNER — 66 %/);assert.ok(!ownerBBody.message.includes('Inventorier accès vérifiés'));
 const emptySid=await create('B','c1','p2');const emptyAnswer=await post(request(emptySid,{...body,operationId:randomUUID()},'B','c1','p2'));assert.equal(emptyAnswer.status,200);assert.equal((await emptyAnswer.json()).message,'Aucune mission autorisée dans ce contexte.');
 const empty=await create('A','c1','p2');
 // A different authorized project sees only its own registry, not the first project's.
 const other=await post(request(empty,{...body,operationId:randomUUID()},'A','c1','p2'));assert.equal(other.status,200);const otherBody=await other.json();assert.match(otherBody.message,/PRIVATE_OTHER_PROJECT/);assert.ok(!otherBody.message.includes('Inventorier accès vérifiés'));
 const atRevocation=modelCalls;pg("UPDATE clara_workspace_memberships SET revoked_at=NOW() WHERE user_id='a' AND workspace_id='w'");assert.equal((await post(request(sid,body))).status,403);assert.equal(modelCalls,atRevocation);pg("UPDATE clara_workspace_memberships SET revoked_at=NULL WHERE user_id='a' AND workspace_id='w'");
 revokeDuringComposition=true;const revoked=await post(request(sid,{...body,operationId:randomUUID()}));assert.equal(revoked.status,409);assert.ok(!(await revoked.text()).includes('Préparer le dossier autorisé'));
 const stale=await post(request(sid,body));assert.equal(stale.status,409,'A durable replay must not disclose another mission after its authority was revoked');
 const renewed=await post(request(sid,{...body,operationId:randomUUID()}));assert.equal(renewed.status,200);assert.ok(!(await renewed.json()).message.includes('Préparer le dossier autorisé'),'New answer uses the fresh registry; historical messages remain intact');
 assert.equal(pg('SELECT jsonb_agg(jsonb_build_object(\'id\',id,\'data\',data,\'updated_at\',updated_at) ORDER BY id) FROM clara_missions'),beforeMissions,'All consultation and denial paths preserve the mission rows');
});


test('mission read helpers refuse absent native context before any global store access',async()=>{
 await assert.rejects(()=>nativeMissionBrainSource(),{status:403,code:'NATIVE_SCOPE_REQUIRED'});
 await assert.rejects(()=>verifyNativeMissionReadProof('a'.repeat(64)),{status:403,code:'NATIVE_SCOPE_REQUIRED'});
});
