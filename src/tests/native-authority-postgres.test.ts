import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {randomUUID,randomBytes,createHash} from "node:crypto";
import {createNativeAuthority} from "../lib/native/authority";
import {RegistryError,type RegistryQuery} from "../lib/canonical/registry";

test('native authority: actual PostgreSQL owner/workspace/client/project ACL, revisions, revocation and historical preservation',{skip:!process.env.CANONICAL_TEST_CONTAINER},async(t)=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const database='native_authority_'+randomUUID().replaceAll('-','');
 execFileSync('docker',['exec',container,'createdb','-U','postgres',database]);
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',database]));
 const pg=(sql:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',database,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
 for(const file of ['001_authenticated_workspaces.sql','002_verified_auth_identities.sql','008_canonical_client_project_registry.sql'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+file),stdio:['pipe','pipe','pipe']});
 pg(`CREATE TABLE clara_sessions(id TEXT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE clara_missions(id TEXT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW()); INSERT INTO clara_sessions VALUES('default','{"mission":{"id":"historical-unknown"}}',NOW());`);
 const historical=pg("SELECT data::text FROM clara_sessions WHERE id='default'");
 execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/012_native_resource_authority.sql'),stdio:['pipe','pipe','pipe']});
 assert.equal(pg("SELECT data::text FROM clara_sessions WHERE id='default'"),historical);assert.equal(pg('SELECT count(*) FROM clara_native_resource_authority').trim(),'0');
 for(const file of ['013_native_scoped_runtime.sql','014_native_commercial_continuity.sql'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+file),stdio:['pipe','pipe','pipe']});
 assert.equal(pg("SELECT data::text FROM clara_sessions WHERE id='default'"),historical);
 const tokens=[randomBytes(32).toString('base64url'),randomBytes(32).toString('base64url')],digest=(value:string)=>createHash('sha256').update(value).digest('hex');
 pg(`INSERT INTO clara_auth_users(id) VALUES('a'),('b'); INSERT INTO clara_auth_workspaces(id) VALUES('w'),('other-w'); INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','a','a'),('fixture','b','b'); INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','w','owner'),('b','w','member'),('a','other-w','owner'); INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${digest(tokens[0])}','a',NOW()+INTERVAL '1 hour'),('${digest(tokens[1])}','b',NOW()+INTERVAL '1 hour');`);
 for(const w of ['w','other-w']){
  for(const c of ['c1','c2'])pg(`INSERT INTO clara_registry_clients VALUES('${w}','${c}','Client','a',NOW(),NULL); INSERT INTO clara_registry_client_access VALUES('${w}','${c}','a',true,true,true,NULL),('${w}','${c}','b',true,true,true,NULL);`);
  for(const [p,c]of [['p1','c1'],['p2','c2']])pg(`INSERT INTO clara_registry_projects VALUES('${w}','${p}','${c}','Project','a',NOW(),NULL); INSERT INTO clara_registry_project_access VALUES('${w}','${p}','a',true,true,true,NULL),('${w}','${p}','b',true,true,true,NULL);`);
 }
 const mission={id:'m1',title:'PRIVATE_PROJECT_A',status:'active',tasks:[],progress:0};const session={state:'WORKING',nativeMissionId:mission.id,mission,conversation:[{id:'private-a',content:'PRIVATE_USER_A',role:'clara'}],brainDashboard:null};
 pg(`INSERT INTO clara_missions(id,data) VALUES('m1','${JSON.stringify(mission)}'); INSERT INTO clara_sessions(id,data) VALUES('native:a','${JSON.stringify(session)}');`);
 for(const [kind,id,table]of [['mission','m1','clara_missions'],['session','native:a','clara_sessions']])pg(`INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT '${kind}',id,'a','w','c1','p1',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Explicit synthetic ownership and complete content review' FROM ${table} WHERE id='${id}'`);
 assert.throws(()=>pg(`INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) VALUES('document','unreviewed-document','a','other-w','c1','p1','${'a'.repeat(64)}','b','Reviewer lacks this workspace membership')`));
 let reads=0;const query:RegistryQuery=async(strings,...values)=>{reads++;const sql=strings.reduce((text,part,i)=>text+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');return pg(`SELECT row_to_json(r) FROM (${sql})r`).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));};
 const read=createNativeAuthority(query);
 const request=(token=tokens[0],w='w',c='c1',p='p1',s='native:a')=>new Request('https://fixture.invalid/api/clara/session?'+new URLSearchParams({workspaceId:w,clientId:c,projectId:p,sessionId:s}),{headers:{cookie:'clara_auth_session='+token}});
 assert.equal((await read(request())).state,'WORKING');
 for(const input of [request(tokens[1]),request(tokens[0],'other-w'),request(tokens[0],'w','c2','p2'),request(tokens[0],'w','c2','p1'),request('Z'.repeat(43)),request(tokens[0],'w','c1','p1','unbound')])await assert.rejects(()=>read(input),(error)=>error instanceof RegistryError&&error.status===403);
 pg(`UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE user_id='a' AND workspace_id='w' AND project_id='p1'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_registry_project_access SET revoked_at=NULL WHERE user_id='a' AND workspace_id='w' AND project_id='p1'`);
 pg(`UPDATE clara_registry_client_access SET can_read=false,can_archive=false,can_manage=false WHERE user_id='a' AND workspace_id='w' AND client_id='c1'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_registry_client_access SET can_read=true,can_archive=true,can_manage=true WHERE user_id='a' AND workspace_id='w' AND client_id='c1'`);
 pg(`UPDATE clara_auth_sessions SET created_at=NOW()-INTERVAL '1 hour',expires_at=NOW()-INTERVAL '1 minute' WHERE user_id='a'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_auth_sessions SET expires_at=NOW()+INTERVAL '1 hour' WHERE user_id='a'`);
 pg(`UPDATE clara_workspace_memberships SET revoked_at=NOW() WHERE user_id='a' AND workspace_id='w'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_workspace_memberships SET revoked_at=NULL WHERE user_id='a' AND workspace_id='w'`);
 pg(`UPDATE clara_auth_sessions SET revoked_at=NOW() WHERE user_id='a'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_auth_sessions SET revoked_at=NULL WHERE user_id='a'`);
 pg(`UPDATE clara_registry_projects SET revoked_at=NOW() WHERE workspace_id='w' AND id='p1'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_registry_projects SET revoked_at=NULL WHERE workspace_id='w' AND id='p1'`);
 pg(`UPDATE clara_sessions SET data=jsonb_set(data,'{conversation}','[]') WHERE id='native:a'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_sessions SET data='${JSON.stringify(session)}' WHERE id='native:a'`);
 pg(`UPDATE clara_missions SET data=jsonb_set(data,'{progress}','10') WHERE id='m1'`);await assert.rejects(()=>read(request()),RegistryError);pg(`UPDATE clara_missions SET data='${JSON.stringify(mission)}' WHERE id='m1'`);
 assert.throws(()=>pg(`UPDATE clara_native_resource_authority SET owner_user_id='b' WHERE resource_kind='session'`));assert.throws(()=>pg('DELETE FROM clara_native_resource_authority'));
 pg(`UPDATE clara_native_resource_authority SET revoked_at=NOW() WHERE resource_kind='session'`);await assert.rejects(()=>read(request()),RegistryError);
 const oldSession={...session,nativeMissionId:undefined};
 pg(`INSERT INTO clara_sessions(id,data) VALUES('native:old','${JSON.stringify(oldSession)}');INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT 'session',id,'a','w','c1','p1',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Explicit synthetic historical snapshot without thread certification' FROM clara_sessions WHERE id='native:old'`);
 const oldView=await read(request(tokens[0],'w','c1','p1','native:old'));assert.equal(oldView.state,'STOPPED');assert.equal(oldView.historyOnly,true);assert.equal(pg("SELECT data->>'state' FROM clara_sessions WHERE id='native:old'").trim(),'WORKING');
 const foreignMission={...mission,id:'m2',title:'PRIVATE_PROJECT_B'};
 pg(`INSERT INTO clara_missions(id,data) VALUES('m2','${JSON.stringify(foreignMission)}'); INSERT INTO clara_sessions(id,data) VALUES('native:cross','${JSON.stringify({...session,mission:foreignMission})}'),('native:product','${JSON.stringify({...session,mission:null,brainDashboard:{context:{event:{context:{productId:'clara-live'}}}}})}');`);
 pg(`INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT 'mission',id,'a','w','c2','p2',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Explicit synthetic complete content review' FROM clara_missions WHERE id='m2';`);
 for(const id of ['native:cross','native:product']){
  pg(`INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT 'session',id,'a','w','c1','p1',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Explicit synthetic complete content review' FROM clara_sessions WHERE id='${id}'`);
  await assert.rejects(()=>read(request(tokens[0],'w','c1','p1',id)),RegistryError);
 }
 assert.equal(pg("SELECT data::text FROM clara_sessions WHERE id='default'"),historical);assert.ok(reads>=18);console.info(`Checked ${reads} real PostgreSQL authority reads; no historical backfill.`);
});
