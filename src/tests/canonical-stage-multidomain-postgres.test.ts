import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {createStageAuthority} from '@/lib/canonical/stage-authority';
import type {RegistryQuery} from '@/lib/canonical/registry';

test('v2 Stage: explicit per-domain operation grants on real PostgreSQL and restricted runtime role',{skip:!process.env.CANONICAL_TEST_CONTAINER},async(t)=>{
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const db='stage_'+randomUUID().replaceAll('-','');execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
 t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
 for(const f of ['001_authenticated_workspaces','002_verified_auth_identities','008_canonical_client_project_registry','009_canonical_archive_authority','010_canonical_archive_serialization','012_native_resource_authority','027_canonical_stage_decisions','028_canonical_stage_multidomain'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+f+'.sql'),stdio:['pipe','pipe','pipe']});
 const hash=(s:string)=>createHash('sha256').update(s).digest('hex');const session=hash('synthetic-authenticated-session');
 pg(`INSERT INTO clara_auth_users(id) VALUES('a'),('b');INSERT INTO clara_auth_workspaces(id) VALUES('w'),('foreign');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','a','a'),('fixture','b','b');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','w','owner'),('b','w','member');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${session}','a',NOW()+INTERVAL '1 hour');
 INSERT INTO clara_registry_clients(workspace_id,id,display_name,created_by) VALUES('w','c','Client','a');
 INSERT INTO clara_registry_projects(workspace_id,id,client_id,display_name,created_by) VALUES('w','p','c','Project','a');
 INSERT INTO clara_registry_client_access(workspace_id,client_id,user_id,can_read,can_archive,can_manage) VALUES('w','c','a',true,true,true);
 INSERT INTO clara_registry_project_access(workspace_id,project_id,user_id,can_read,can_archive,can_manage) VALUES('w','p','a',true,true,true);
 INSERT INTO clara_registry_identity_links(workspace_id,os_user_id,live_user_id,proof_id) VALUES('w','a','u','ip');
 INSERT INTO clara_registry_project_links(workspace_id,project_id,client_id,live_project_id,live_user_id,os_user_id,proof_id) VALUES('w','p','c','lp','u','a','pp');`);
 pg(`INSERT INTO clara_sessions(id,data) VALUES('native:stage','{"conversation":[]}');INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) VALUES('session','native:stage','a','w','c','p',encode(sha256(convert_to('{"conversation": []}','UTF8')),'hex'),'a','Explicit isolated canonical Stage acceptance');`);
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');return pg(`SELECT row_to_json(r) FROM (${statement})r`).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));};
 const ctx={digest:session,workspaceId:'w'},service=createStageAuthority(query);

 for(const domain of ['light','sound','video','structure','production']){
  const intent={schemaVersion:'clara.stage-intent.v2',capability:`stage:${domain}:mutate:v2`,domain,operation:'pose',intentDigest:hash(domain),scope:{nativeSessionId:'native:stage',workspaceId:'w',osUserId:'a',clientId:'c',projectId:'p',liveUserId:'u',liveProjectId:'lp'}};
  const payload={id:randomUUID(),nonceHash:hash(domain+'nonce'),intent};
  await assert.rejects(service.command(ctx,'c','p','approve',payload));
  await service.command(ctx,'c','p','grantSpatial',{userId:'a',domain,operation:'pose',enabled:true});
  await assert.rejects(service.command(ctx,'c','p','approve',{...payload,intent:{...intent,operation:'retire'}}));
  assert.equal((await service.command(ctx,'c','p','approve',payload)).state,'approved');
  const ticket={id:payload.id,nonceHash:payload.nonceHash,intentDigest:intent.intentDigest};
  assert.equal((await service.command({digest:'',workspaceId:'w'},'','','claim',ticket)).state,'claimed');
  await assert.rejects(service.command(ctx,'c','p','grantSpatial',{userId:'a',domain,operation:'pose',enabled:false}));
  await service.command(ctx,'c','p','revoke',{...ticket,liveCancellation:'cancelled'});
  await service.command(ctx,'c','p','grantSpatial',{userId:'a',domain,operation:'pose',enabled:false});
  await assert.rejects(service.command({digest:'',workspaceId:'w'},'','','claim',ticket));
 }
 pg("INSERT INTO clara_registry_project_access(workspace_id,project_id,user_id,can_read,can_archive,can_manage) VALUES('w','p','b',true,true,true);UPDATE clara_workspace_memberships SET revoked_at=NOW() WHERE user_id='b'");
 await assert.rejects(service.command(ctx,'c','p','grantSpatial',{userId:'b',domain:'structure',operation:'pose',enabled:true}),'revoked target membership cannot receive a new grant');
 const binding={version:1,digest:hash('source')};
 const boundIntent={schemaVersion:'clara.stage-intent.v2',capability:'stage:structure:mutate:v2',domain:'structure',operation:'pose',source:binding,intentDigest:hash('bound-intent'),modelDigest:hash('model'),modelId:'stage-model',preparationId:'prep',runId:null,expectedRevision:null,scope:{nativeSessionId:'native:stage',workspaceId:'w',osUserId:'a',clientId:'c',projectId:'p',liveUserId:'u',liveProjectId:'lp'}};
 await service.command(ctx,'c','p','grantSpatial',{userId:'a',domain:'structure',operation:'pose',enabled:true});
 const issued={id:randomUUID(),nonceHash:hash('bound-nonce'),intent:boundIntent};await service.command(ctx,'c','p','approve',issued);
 const redeem={id:issued.id,nonceHash:issued.nonceHash,intentDigest:boundIntent.intentDigest};await service.command({digest:'',workspaceId:'w'},'','','claim',redeem);
 const receipt={schemaVersion:'clara.stage-receipt.v1',decisionId:issued.id,intentDigest:boundIntent.intentDigest,modelId:'stage-model',preparationId:'prep',runId:null,parent:null,modelDigest:boundIntent.modelDigest,revision:hash('clara.stage-revision.v1\n'+issued.id+'\nnone\n'+boundIntent.modelDigest),domain:'structure',operation:'pose',source:binding};
 for(const change of [{source:{...binding,version:2}},{domain:'sound'},{operation:'retire'},{intentDigest:hash('foreign-intent')},{certified:true}])await assert.rejects(service.command({digest:'',workspaceId:'w'},'','','settle',{...redeem,receipt:{...receipt,...change}}));
 assert.equal((await service.command({digest:'',workspaceId:'w'},'','','settle',{...redeem,receipt})).state,'committed');
 const expIntent={schemaVersion:'clara.stage-intent.v2',capability:'stage:structure:mutate:v2',domain:'structure',operation:'pose',intentDigest:hash('expiry-intent'),scope:{nativeSessionId:'native:stage',workspaceId:'w',osUserId:'a',clientId:'c',projectId:'p',liveUserId:'u',liveProjectId:'lp'}};
 await service.command(ctx,'c','p','grantSpatial',{userId:'a',domain:'structure',operation:'pose',enabled:true});
 const exp={id:randomUUID(),nonceHash:hash('expiry'),intent:expIntent};
 await assert.rejects(service.command(ctx,'c','p','approve',{...exp,intent:{...expIntent,scope:{...expIntent.scope,projectId:'foreign'}}}));
 await service.command(ctx,'c','p','approve',exp);pg(`UPDATE clara_registry_stage_decisions SET expires_at=NOW()-INTERVAL '1 second' WHERE id='${exp.id}'`);
 await assert.rejects(service.command({digest:'',workspaceId:'w'},'','','claim',{id:exp.id,nonceHash:exp.nonceHash,intentDigest:expIntent.intentDigest}));
 pg("UPDATE clara_registry_stage_grants SET enabled=false WHERE domain='structure'");
 assert.equal(pg("SELECT has_function_privilege('public','clara_stage_permission(text,text,text,jsonb)','EXECUTE')").trim(),'f');
 const role='stage_v2_'+randomUUID().replaceAll('-','');
 pg(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;GRANT USAGE ON SCHEMA public TO ${role};GRANT SELECT ON clara_registry_stage_grants,clara_registry_project_access TO ${role};GRANT SELECT,UPDATE ON clara_auth_workspaces,clara_auth_sessions,clara_workspace_memberships,clara_registry_identity_links,clara_registry_project_links,clara_registry_clients,clara_registry_projects,clara_registry_client_access,clara_registry_project_access TO ${role};GRANT SELECT ON clara_sessions,clara_missions,clara_native_resource_authority,clara_auth_identities TO ${role};GRANT SELECT,INSERT,UPDATE ON clara_registry_stage_decisions TO ${role};GRANT INSERT ON clara_registry_audit TO ${role};GRANT USAGE ON SEQUENCE clara_registry_audit_id_seq TO ${role};GRANT EXECUTE ON FUNCTION clara_registry_authority(text,text,text,text,text),clara_registry_stage_command(text,text,text,text,text,jsonb),clara_native_read_session(text,text,text,text,text) TO ${role};GRANT EXECUTE ON FUNCTION clara_stage_permission(text,text,text,jsonb) TO ${role}`);
 try{assert.equal(pg(`SET ROLE ${role};SELECT clara_stage_permission('w','p','a','{"schemaVersion":"clara.stage-intent.v2","capability":"stage:structure:mutate:v2","domain":"structure","operation":"pose"}')`).trim(),'f');pg("UPDATE clara_registry_stage_grants SET enabled=true WHERE domain='structure' AND operation='pose'");const limited={id:randomUUID(),nonceHash:hash('limited'),intent:{schemaVersion:'clara.stage-intent.v2',capability:'stage:structure:mutate:v2',domain:'structure',operation:'pose',intentDigest:hash('limited-intent'),scope:{nativeSessionId:'native:stage',workspaceId:'w',osUserId:'a',clientId:'c',projectId:'p',liveUserId:'u',liveProjectId:'lp'}}};assert.equal(JSON.parse(pg(`SET ROLE ${role};SELECT clara_registry_stage_command('${session}','w','c','p','approve','${JSON.stringify(limited)}'::jsonb)`)).state,'approved');assert.throws(()=>pg(`SET ROLE ${role};INSERT INTO clara_registry_stage_grants VALUES('w','p','a','structure','pose',true)`));assert.throws(()=>pg(`SET ROLE ${role};CREATE TABLE forbidden_stage(id int)`));}finally{pg(`DROP OWNED BY ${role};DROP ROLE ${role}`);}
 assert.throws(()=>pg("UPDATE clara_registry_project_access SET can_manage=false"),'ancestor revocation requires cancelling pending decisions first');
 const pending=JSON.parse(pg("SELECT COALESCE(json_agg(id),'[]') FROM clara_registry_stage_decisions WHERE state IN ('approved','claimed') AND intent->>'schemaVersion'='clara.stage-intent.v2'")) as string[];
 for(const id of pending)await service.command(ctx,'c','p','revoke',{id,nativeSessionId:'native:stage',liveCancellation:'cancelled'});
 for(const statement of ["UPDATE clara_registry_project_access SET can_manage=false;UPDATE clara_registry_project_access SET can_manage=true", "UPDATE clara_registry_client_access SET can_manage=false;UPDATE clara_registry_client_access SET can_manage=true", "UPDATE clara_workspace_memberships SET revoked_at=NOW();UPDATE clara_workspace_memberships SET revoked_at=NULL"]){
  pg("UPDATE clara_registry_stage_grants SET enabled=true");pg(statement);assert.equal(pg('SELECT count(*) FROM clara_registry_stage_grants WHERE enabled').trim(),'0','restoring ancestor ACL must not silently restore explicit operation grants');
 }
 const count=pg('SELECT count(*) FROM clara_registry_stage_decisions');execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/028_canonical_stage_multidomain.sql'),stdio:['pipe','pipe','pipe']});assert.equal(pg('SELECT count(*) FROM clara_registry_stage_decisions'),count);
});
