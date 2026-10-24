import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {nativeCommands,withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {saveMission} from '@/modules/missions/mission-store';

test('V1 A01/A02: identical mission titles never merge identities or cross owner/project boundaries',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const db='native_browser_'+randomUUID().replaceAll('-','');
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db],{stdio:'pipe'}));
 const query:RegistryQuery=async(strings,...values)=>{
  const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');
  const out=execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',`SELECT row_to_json(r) FROM (${statement})r`],{encoding:'utf8',stdio:'pipe'});
  return out.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 };
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
 const commands=nativeCommands(query),digest=(u:string)=>createHash('sha256').update(u.repeat(43)).digest('hex');
 const scope=(u:string,p:string,s='native:new')=>({digest:digest(u),workspaceId:'w',clientId:'c1',projectId:p,sessionId:s});
 const created=[];
 for(const [u,p,note] of [['A','p1','PRIVATE_A_ONE'],['A','p1','PRIVATE_A_TWO'],['A','p2','PRIVATE_A_OTHER_PROJECT'],['B','p1','PRIVATE_B']] as const){
  const sid=String((await commands(scope(u,p),'create')).sessionId);
  const req=new Request('https://os.fixture.example/api/native/runtime?'+new URLSearchParams({workspaceId:'w',clientId:'c1',projectId:p,sessionId:sid}),{headers:{cookie:'clara_auth_session='+u.repeat(43),origin:'https://os.fixture.example'}});
  await withNativeScope(req,true,async()=>{const ctx=nativeContext()!;const mission={id:'new',title:'Même nom — réception V1',objective:note,status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};await saveMission(mission);ctx.session.mission=mission;},query);
  const view=await commands(scope(u,p,sid),'read');created.push({u,p,sid,missionId:(view.session as {mission:{id:string}}).mission.id});
 }
 assert.equal(new Set(created.map(c=>c.missionId)).size,4);
 for(const c of created){
  const view=await nativeCommands(query)(scope(c.u,c.p,c.sid),'read');const ids=(view.missions as Array<{id:string}>).map(m=>m.id);
  assert.deepEqual(new Set(ids),new Set(created.filter(m=>m.u===c.u&&m.p===c.p).map(m=>m.missionId)));
  assert.equal((view.session as {mission:{id:string}}).mission.id,c.missionId);
 }
 await assert.rejects(()=>commands(scope('B','p1',created[0].sid),'read'));
 await assert.rejects(()=>commands(scope('A','p2',created[0].sid),'read'));
});
