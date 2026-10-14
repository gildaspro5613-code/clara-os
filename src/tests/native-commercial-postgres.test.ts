import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {nativeCommands,withNativeScope,nativeContext,writableNativeContext} from '@/lib/native/scoped-context';
import {saveMission} from '@/modules/missions/mission-store';
import {saveSession} from '@/lib/core/store/session-store';
import {resolveOperationalContext} from '@/lib/core/operational-context';
import {loadAcquisitionRecord,saveCommercialDraft} from '@/lib/acquisition/acquisition-store';
import {resolveCommercialDraft,updateCommercialDraft,executeCommercialTransportBoundary,createCommercialSendProposal} from '@/lib/acquisition/commercial-communication-service';
import {Journal} from '@/lib/core/journal';
import {writeActionEntry} from '@/lib/core/journal-writer';
import {seedNativeCommercialFixture} from './helpers/native-commercial-fixture';
import type {RegistryQuery} from '@/lib/canonical/registry';

test('commercial continuity uses actual stores and PostgreSQL, excludes unbound/foreign records and commits draft/session/mission/journal atomically',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const db='commercial_'+randomUUID().replaceAll('-','');execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(statement:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',statement],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
 for(const migration of ['001_authenticated_workspaces','002_verified_auth_identities','008_canonical_client_project_registry','012_native_resource_authority','013_native_scoped_runtime','014_native_commercial_continuity'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+migration+'.sql'),stdio:['pipe','pipe','pipe']});
 const tokens=[randomBytes(32).toString('base64url'),randomBytes(32).toString('base64url')],digest=(s:string)=>createHash('sha256').update(s).digest('hex');
 pg(`INSERT INTO clara_auth_users VALUES('a',NOW()),('b',NOW());INSERT INTO clara_auth_workspaces VALUES('w',NOW());INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('synthetic-provider','a','a'),('synthetic-provider','b','b');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','w','owner'),('b','w','member');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${digest(tokens[0])}','a',NOW()+INTERVAL '1 hour'),('${digest(tokens[1])}','b',NOW()+INTERVAL '1 hour');`);
 for(const [c,projects] of [['c1',['p1','p2']],['c2',['p3']]] as const){pg(`INSERT INTO clara_registry_clients VALUES('w','${c}','Client','a',NOW(),NULL);INSERT INTO clara_registry_client_access VALUES('w','${c}','a',true,true,true,NULL),('w','${c}','b',true,true,true,NULL);`);for(const p of projects)pg(`INSERT INTO clara_registry_projects VALUES('w','${p}','${c}','Project','a',NOW(),NULL);INSERT INTO clara_registry_project_access VALUES('w','${p}','a',true,true,true,NULL),('w','${p}','b',true,true,true,NULL);`);}
 seedNativeCommercialFixture(pg);
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{return pg(`SELECT row_to_json(r) FROM (${statement})r`).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}};
 const command=nativeCommands(query),scope=(who=0,c='c1',p='p1',s='native:new')=>({digest:digest(tokens[who]),workspaceId:'w',clientId:c,projectId:p,sessionId:s});
 const sid=String((await command(scope(),'create')).sessionId),bSid=String((await command(scope(1),'create')).sessionId),p2Sid=String((await command(scope(0,'c1','p2'),'create')).sessionId),p3Sid=String((await command(scope(0,'c2','p3'),'create')).sessionId);
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
 const request=(who=0,c='c1',p='p1',s=sid)=>new Request('https://os.fixture.example/api?'+new URLSearchParams({workspaceId:'w',clientId:c,projectId:p,sessionId:s}),{headers:{cookie:'clara_auth_session='+tokens[who],origin:'https://os.fixture.example'}});
 for(const [sel,expected] of [[scope(0,'c1','p1',sid),'prospect-a'],[scope(1,'c1','p1',bSid),'prospect-b'],[scope(0,'c1','p2',p2Sid),'prospect-p2'],[scope(0,'c2','p3',p3Sid),'prospect-p3']] as const){const view=await command(sel,'read');assert.deepEqual((view.acquisitions as {record:{submission_id:string}}[]).map(x=>x.record.submission_id),[expected]);}
 for(const bad of ['prospect-b','prospect-p2','prospect-p3','unbound-history'])await assert.rejects(()=>withNativeScope(request(),true,async()=>{writableNativeContext().session.acquisitionSubmissionId=bad;},query));
 await withNativeScope(request(),true,async()=>{const ctx=writableNativeContext();ctx.session.acquisitionSubmissionId='prospect-a';await new Journal().addEntry(writeActionEntry('Explicit contact selection','prospect-a'));},query);
 let missionId='';await withNativeScope(request(),true,async()=>{const ctx=nativeContext()!,record=(await resolveOperationalContext()).acquisition!;assert.equal(record.submissionId,'prospect-a');
  const mission={id:'new',title:'COMMERCIAL_MISSION_A',objective:'Prepare without sending',status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};await saveMission(mission);missionId=mission.id;ctx.session.mission=mission;
  const resolved=await resolveCommercialDraft('w','prospect-a');assert.equal(resolved?.draft.recipient.email,'prospect-a@example.invalid');assert.equal(resolved?.draft.revision,1);
  ctx.session.conversation.push({id:'dialogue',role:'user',content:'PRIVATE_COMMERCIAL_DIALOGUE',createdAt:new Date().toISOString()});await saveSession(ctx.session,sid);await new Journal().addEntry(writeActionEntry('Draft prepared',resolved!.draft.subject));
 },query);
 const persisted=await command(scope(0,'c1','p1',sid),'read');assert.equal((persisted.session as {mission:{id:string}}).mission.id,missionId);assert.ok(JSON.stringify(persisted).includes('PRIVATE_COMMERCIAL_DIALOGUE'));assert.equal((persisted.journal as unknown[]).length,2);
 await withNativeScope(request(),false,async()=>{const record=await loadAcquisitionRecord('w','prospect-a');assert.equal(record?.commercialDraft?.recipient.email,'prospect-a@example.invalid');assert.equal(record?.commercialDraft?.revision,1);assert.equal(await loadAcquisitionRecord('w','unbound-history'),null);},query);
 // Both calls genuinely overlap after reading the same draft from independent threads.
 const secondSid=String((await command(scope(),'create')).sessionId);await withNativeScope(request(0,'c1','p1',secondSid),true,async()=>{writableNativeContext().session.acquisitionSubmissionId='prospect-a';},query);
 let count=0,release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
 const revise=(s:string,subject:string)=>withNativeScope(request(0,'c1','p1',s),true,async()=>{await updateCommercialDraft({workspaceId:'w',submissionId:'prospect-a',subject,body:'Durable body'});if(++count===2)release();await gate;},query);
 const race=await Promise.allSettled([revise(sid,'Revision A'),revise(secondSid,'Revision B')]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);assert.equal(race.filter(x=>x.status==='rejected').length,1);assert.equal((race.find(x=>x.status==='rejected') as PromiseRejectedResult).reason.status,409);
 await withNativeScope(request(),true,async()=>{const before=await loadAcquisitionRecord('w','prospect-a');assert.equal(before?.commercialDraft?.revision,2);
  assert.equal((await executeCommercialTransportBoundary({workspaceId:'w',submissionId:'prospect-a',sessionKey:sid,recipientEmail:'prospect-a@example.invalid',draftRevision:2})).code,'NATIVE_COMMERCIAL_SEND_DISABLED');
  let bridgeCalls=0;assert.equal((await createCommercialSendProposal({context:{workspaceId:'w',submissionId:'prospect-a',sessionKey:sid,recipientEmail:'prospect-a@example.invalid',draftRevision:2},principal:{actorId:'a',workspaceId:'w',plan:'premium',approvedCapabilityIds:[]}}, {execute:async()=>{bridgeCalls++;return {success:true,message:'must not execute'};}})).success,false);assert.equal(bridgeCalls,0);
  await assert.rejects(()=>saveCommercialDraft('w','prospect-b',before!.commercialDraft!));
 },query);
 // Revocation and expiry after preparation prevent ALL staged persistence.
 const original=pg("SELECT commercial_draft::text FROM clara_acquisition_records WHERE submission_id='prospect-a'").trim();
 await assert.rejects(()=>withNativeScope(request(),true,async()=>{await updateCommercialDraft({workspaceId:'w',submissionId:'prospect-a',subject:'Must not commit',body:'No'});pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE user_id='a' AND project_id='p1'");},query));assert.equal(pg("SELECT commercial_draft::text FROM clara_acquisition_records WHERE submission_id='prospect-a'").trim(),original);
 pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE user_id='a' AND project_id='p1';UPDATE clara_auth_sessions SET created_at=NOW()-INTERVAL '1 hour',expires_at=NOW()-INTERVAL '1 minute' WHERE user_id='a'");await assert.rejects(()=>command(scope(0,'c1','p1',sid),'read'));
 assert.equal(pg("SELECT COUNT(*) FROM clara_native_resource_authority WHERE resource_kind='acquisition' AND resource_id='w/unbound-history'").trim(),'0');
});
