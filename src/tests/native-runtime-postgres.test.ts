import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {nativeCommands,withNativeScope,nativeContext} from '../lib/native/scoped-context';
import {saveMission,loadMissions,loadMission} from '../modules/missions/mission-store';
import {saveSession} from '../lib/core/store/session-store';
import {Journal} from '../lib/core/journal';
import {JournalEntryType} from '../lib/core/journal-entry';
import {buildBrainSources} from '../lib/brain/brain-source-registry';
import {loadMemory} from '../lib/brain/memory';
import {getRuntime} from '../lib/core/runtime';
import {EventType} from '../types';
import type {RegistryQuery} from '../lib/canonical/registry';

test('native runtime on real PostgreSQL: two users, clients, projects, atomic versions, revocation, histories and isolation',{skip:!process.env.CANONICAL_TEST_CONTAINER},async(t)=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const db='runtime_'+randomUUID().replaceAll('-','');execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(statement:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',statement],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
 for(const name of ['001_authenticated_workspaces','002_verified_auth_identities','008_canonical_client_project_registry','012_native_resource_authority','013_native_scoped_runtime','014_native_commercial_continuity'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+name+'.sql'),stdio:['pipe','pipe','pipe']});
 const tokens=[randomBytes(32).toString('base64url'),randomBytes(32).toString('base64url')],hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 pg(`INSERT INTO clara_auth_users(id) VALUES('a'),('b');INSERT INTO clara_auth_workspaces(id) VALUES('w');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','a','a'),('fixture','b','b');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','w','owner'),('b','w','member');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${hash(tokens[0])}','a',NOW()+INTERVAL '1 hour'),('${hash(tokens[1])}','b',NOW()+INTERVAL '1 hour');INSERT INTO clara_sessions(id,data) VALUES('default','{"mission":{"id":"unknown-history"}}');INSERT INTO clara_missions(id,data) VALUES('legacy-unknown','{"id":"legacy-unknown","title":"UNKNOWN_PRIVATE_HISTORY"}');`);
 for(const [c,projects]of [['c1',['p1','p2']],['c2',['p3']]] as const){
  pg(`INSERT INTO clara_registry_clients VALUES('w','${c}','Client','a',NOW(),NULL);INSERT INTO clara_registry_client_access VALUES('w','${c}','a',true,true,true,NULL),('w','${c}','b',true,true,true,NULL)`);
  for(const p of projects)pg(`INSERT INTO clara_registry_projects VALUES('w','${p}','${c}','Project','a',NOW(),NULL);INSERT INTO clara_registry_project_access VALUES('w','${p}','a',true,true,true,NULL),('w','${p}','b',true,true,true,NULL)`);
 }
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{return pg(`SELECT row_to_json(r) FROM (${statement})r`).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){const code=String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1];throw {code};}};
 const command=nativeCommands(query),scope=(who=0,c='c1',p='p1',s='native:new')=>({digest:hash(tokens[who]),workspaceId:'w',clientId:c,projectId:p,sessionId:s});
 const sid=String((await command(scope(),'create')).sessionId),bSid=String((await command(scope(1),'create')).sessionId),p2Sid=String((await command(scope(0,'c1','p2'),'create')).sessionId),p3Sid=String((await command(scope(0,'c2','p3'),'create')).sessionId);
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
 const request=(who=0,c='c1',p='p1',s=sid)=>new Request('https://os.fixture.example/api/native/runtime?'+new URLSearchParams({workspaceId:'w',clientId:c,projectId:p,sessionId:s}),{headers:{cookie:'clara_auth_session='+tokens[who],origin:'https://os.fixture.example'}});
 let missionId='';await withNativeScope(request(),true,async()=>{
  const ctx=nativeContext()!;assert.equal(ctx.userId,'a');assert.equal((await loadMissions()).length,0);
  const mission={id:'new',title:'PRIVATE_A_P1',objective:'Owned objective',status:'active' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};
  await saveMission(mission);missionId=mission.id;ctx.session.mission=mission;
  ctx.session.conversation.push({id:randomUUID(),role:'user',content:'PRIVATE_A_CONVERSATION',createdAt:new Date().toISOString()});await saveSession(ctx.session,sid);
  await new Journal().addEntry({id:randomUUID(),type:JournalEntryType.ACTION,createdAt:new Date(),summary:'PRIVATE_A_JOURNAL'});
  const event={id:randomUUID(),type:EventType.USER_MESSAGE,source:'CLARA_CHAT',timestamp:new Date(),payload:{message:'documents drive gmail'}};
  const sources=await buildBrainSources(event,new Date());assert.ok(sources.length>0);assert.ok(sources.every(s=>!s.available&&s.data===null));assert.deepEqual(loadMemory({event,now:new Date()}).shortTerm,[]);
 },query);
 const own=await command(scope(0,'c1','p1',sid),'read');assert.equal((own.session as {mission:{id:string}}).mission.id,missionId);assert.equal((own.journal as unknown[]).length,1);
 for(const sel of [scope(1,'c1','p1',sid),scope(0,'c1','p2',sid),scope(0,'c2','p3',sid),scope(0,'c2','p1',sid)])await assert.rejects(()=>command(sel,'read'));
 for(const sel of [scope(1,'c1','p1',bSid),scope(0,'c1','p2',p2Sid),scope(0,'c2','p3',p3Sid)]){const view=await command(sel,'read');assert.equal((view.missions as unknown[]).length,0);assert.equal((view.journal as unknown[]).length,0);assert.ok(!JSON.stringify(view).includes('PRIVATE_A'));}
 const secondASid=String((await command(scope(),'create')).sessionId);
 await withNativeScope(request(0,'c1','p1',secondASid),true,async()=>{const ctx=nativeContext()!;ctx.session.mission=ctx.missions.get(missionId)!;await saveSession(ctx.session,secondASid);},query);
 await withNativeScope(request(),true,async()=>{const ctx=nativeContext()!,m=ctx.missions.get(missionId)!;await saveMission({...m,tasks:[{id:'manual-task',title:'Owned manual task',completed:false}],progress:1});ctx.session.mission=ctx.missions.get(missionId)!;await saveSession(ctx.session,sid);},query);
 assert.equal(((await command(scope(0,'c1','p1',secondASid),'read')).session as {mission:{progress:number}}).mission.progress,1);
 await withNativeScope(request(),true,async()=>{await getRuntime().stop();},query);assert.equal((await command(scope(0,'c1','p1',sid),'read')).session instanceof Object,true);
 // Resource namespaces cannot be read/written through an unscoped legacy
 // runtime, including from external product code that remains unchanged.
 await assert.rejects(()=>loadMission(missionId));await assert.rejects(()=>saveSession(own.session as never,sid));
 pg(`INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) VALUES('document','doc-a','a','w','c1','p1','${'a'.repeat(64)}','a','Explicit synthetic document canonical ownership review')`);
 const certificate=await command(scope(0,'c1','p1',sid),'document',{fileId:'doc-a'});assert.deepEqual(certificate,{osBindingVerified:true,driveRightsVerified:false,contentRevisionVerified:false,readAllowed:false});
 await assert.rejects(()=>command(scope(1,'c1','p1',bSid),'document',{fileId:'doc-a'}));await assert.rejects(()=>command(scope(0,'c1','p2',p2Sid),'document',{fileId:'doc-a'}));
 const sessions=await command(scope(1),'list');assert.deepEqual((sessions.sessions as {sessionId:string}[]).map(s=>s.sessionId),[bSid]);
 // Concurrent request contexts never exchange sessions, even within one project.
 let release!:()=>void;const barrier=new Promise<void>(r=>{release=r;});
 const aWrite=withNativeScope(request(),true,async()=>{const ctx=nativeContext()!;await barrier;assert.equal(ctx.userId,'a');ctx.session.conversation.push({id:'a-parallel',role:'user',content:'ONLY_A_PARALLEL',createdAt:new Date().toISOString()});await saveSession(ctx.session,sid);},query);
 const bWrite=withNativeScope(request(1,'c1','p1',bSid),true,async()=>{const ctx=nativeContext()!;assert.equal(ctx.userId,'b');ctx.session.conversation.push({id:'b-parallel',role:'user',content:'ONLY_B_PARALLEL',createdAt:new Date().toISOString()});await saveSession(ctx.session,bSid);release();},query);
 await Promise.all([aWrite,bWrite]);assert.ok(!JSON.stringify(await command(scope(0,'c1','p1',sid),'read')).includes('ONLY_B_PARALLEL'));assert.ok(!JSON.stringify(await command(scope(1,'c1','p1',bSid),'read')).includes('ONLY_A_PARALLEL'));
 let entered=0;let open!:()=>void;const overlap=new Promise<void>(r=>{open=r;});
 const competing=(content:string)=>withNativeScope(request(),true,async()=>{const ctx=nativeContext()!;ctx.session.conversation.push({id:content,role:'user',content,createdAt:new Date().toISOString()});await saveSession(ctx.session,sid);if(++entered===2)open();await overlap;},query);
 const race=await Promise.allSettled([competing('CAS_FIRST'),competing('CAS_SECOND')]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.filter(r=>r.status==='rejected').length,1);
 assert.equal((race.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.status,409);
 pg(`UPDATE clara_registry_project_access SET can_manage=false WHERE user_id='b' AND project_id='p1'`);assert.ok(await command(scope(1,'c1','p1',bSid),'read'));await assert.rejects(()=>withNativeScope(request(1,'c1','p1',bSid),true,async()=>{throw Error('Read-only user entered write runtime');},query));
 const before=(await command(scope(0,'c1','p1',sid),'read')).session;
 await assert.rejects(()=>command(scope(0,'c1','p1',sid),'commit',{expected:{},session:before,missions:[],journal:[]}));
 await assert.rejects(()=>withNativeScope(request(),true,async()=>{const ctx=nativeContext()!;ctx.session.state='WORKING' as typeof ctx.session.state;await saveSession(ctx.session,sid);pg(`UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE user_id='a' AND project_id='p1'`);},query));
 assert.equal(pg("SELECT data->>'state' FROM clara_sessions WHERE id='"+sid+"'").trim(),'STOPPED');
 assert.equal(pg("SELECT count(*) FROM clara_native_resource_authority WHERE resource_id IN ('default','legacy-unknown')").trim(),'0');assert.ok(pg("SELECT data::text FROM clara_missions WHERE id='legacy-unknown'").includes('UNKNOWN_PRIVATE_HISTORY'));
 console.info('Native positive creation/write/reopen, two-user three-project isolation, provider-denial and commit-time revocation verified.');
});
