import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {neonConfig} from '@neondatabase/serverless';
import {runCloudPreflight} from '../lib/recette/cloud-preflight';
import {fixture} from '../lib/recette/fixture-preflight';

const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',CLARA_RECETTE_MODE:'isolated-v1',
 CLARA_RECETTE_NEON_HOST:'ep-recette-test.eu-central-1.aws.neon.tech',CLARA_RECETTE_NEON_BRANCH_ID:fixture.branch,
 DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic-password@ep-recette-test.eu-central-1.aws.neon.tech/neondb?sslmode=require',
 GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',NEON_API_KEY:'synthetic-api-secret',
 NEON_API_KEY_PERMISSION_REVIEW:'project-read-only-confirmed',NEON_API_KEY_REVIEW_PROJECT:fixture.project};
const args=['--check-cloud',`--confirm=${fixture.branch}`];
const columns=[['clara_auth_users','id'],['clara_auth_workspaces','id'],
 ...['issuer','subject','user_id'].map(c=>['clara_auth_identities',c]),
 ...['user_id','workspace_id','role','revoked_at'].map(c=>['clara_workspace_memberships',c]),
 ...['token_hash','user_id','expires_at','revoked_at'].map(c=>['clara_auth_sessions',c])];

test('read-only Cloud entrypoint uses real SDK with simulated HTTP; never requests a session or sends SQL writes',async t=>{
 const original=neonConfig.fetchFunction;t.after(()=>{neonConfig.fetchFunction=original;});
 let sqlCalls=0,metadataCalls=0,mode='ok';
 neonConfig.fetchFunction=async (_url,init)=>{
  sqlCalls++;
  assert.equal(new Headers(init?.headers).get('Neon-Batch-Read-Only'),'true');
  assert.equal(init?.redirect,'error');
  const body=JSON.parse(String(init?.body));assert.equal(body.queries.length,1);
  const q=body.queries[0].query as string;
  assert.match(q,/^\s*SELECT\b/);
  assert.doesNotMatch(q,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|DO)\s/i);
  let rows:Record<string,unknown>[];
  if(q.includes('FROM pg_roles'))rows=[{db:'neondb',role:mode==='owner'?'neondb_owner':'clara_os_recette_limited',
   rolsuper:mode==='super',rolbypassrls:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,schema_create:false,database_create:false}];
  else if(q.includes('has_language_privilege'))rows=[{can_connect:true,can_use_schema:true,can_use_language:true,
   lock_execute:true,hash_execute:true,config_execute:mode!=='function',setting_execute:true,now_execute:true,not_owner:true}];
  else rows=columns.map(([name,col])=>({name,col,can_read:true,can_insert:!(mode==='column'&&name==='clara_auth_sessions'&&col==='token_hash')}));
  const names=Object.keys(rows[0]);
  return Response.json({results:[{command:'SELECT',fields:names.map(name=>({name,dataTypeID:3802})),
   rows:rows.map(row=>names.map(name=>JSON.stringify(row[name]))),rowCount:rows.length}]});
 };
 const metadata:typeof fetch=async(url,init)=>{
  metadataCalls++;assert.equal(String(url),`https://console.neon.tech/api/v2/projects/${fixture.project}/endpoints`);
  assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');
  if(mode==='network')throw Error(env.NEON_API_KEY+' '+env.DATABASE_URL);
  return Response.json({endpoints:[{host:env.CLARA_RECETTE_NEON_HOST,branch_id:mode==='branch'?'main':fixture.branch}]});
 };
 await t.test('success without any session token; report explicitly limits API-key attestation and write-batch proof',async()=>{
  const result=await runCloudPreflight(env,args,metadata);
  assert.equal(result.status,'PRECHECK_PASSED');assert.equal(result.writesExecuted,false);
  assert.equal(result.apiKeyPermissions,'HUMAN_ATTESTED_ONLY');assert.equal(result.neonWriteBatch,'NOT_VERIFIED');
  assert.equal(sqlCalls,3);assert.equal(metadataCalls,1);
 });
 await t.test('bad arguments, production, ambient fallback URL or session secret, unattended run and unreviewed key fail before transport',async()=>{
  const before=[sqlCalls,metadataCalls];
  for(const override of [{VERCEL_ENV:'production'},{CLARA_RECETTE_NEON_BRANCH_ID:'main'},
   {POSTGRES_URL:''},{POSTGRES_URL:'synthetic'},{GITHUB_EVENT_NAME:'push'},
   {RECETTE_FIXTURE_SESSION_TOKEN:'must-not-be-used'},{NEON_API_KEY_PERMISSION_REVIEW:'unknown'},
   {NEON_API_KEY_PERMISSION_REVIEW:'write-capable'},{NEON_API_KEY_REVIEW_PROJECT:'other-project'}])
   assert.equal((await runCloudPreflight({...env,...override},args,metadata)).status,'PRECHECK_REFUSED');
  for(const command of ['--apply-cloud','--apply','--plan','--check-cloud --apply'])
   assert.equal((await runCloudPreflight(env,[command,args[1]],metadata)).status,'PRECHECK_REFUSED');
  assert.deepEqual([sqlCalls,metadataCalls],before);
 });
 await t.test('wrong endpoint branch stops before SQL; SQL identity/admin and missing grants are refused precisely',async()=>{
  const before=sqlCalls;mode='branch';assert.equal((await runCloudPreflight(env,args,metadata)).status,'PRECHECK_REFUSED');assert.equal(sqlCalls,before);
  for(mode of ['owner','super'])assert.equal((await runCloudPreflight(env,args,metadata)).status,'PRECHECK_REFUSED');
  mode='function';assert.deepEqual((await runCloudPreflight(env,args,metadata)).missingPrivileges,['EXECUTE set_config(text,text,boolean)']);
  mode='column';assert.deepEqual((await runCloudPreflight(env,args,metadata)).missingPrivileges,['INSERT public.clara_auth_sessions.token_hash']);
 });
 await t.test('errors cannot leak SDK URL, API key or upstream response contents',async()=>{
  mode='network';const result=await runCloudPreflight(env,args,metadata);assert.equal(result.status,'PRECHECK_REFUSED');
  assert.ok(!JSON.stringify(result).includes(env.NEON_API_KEY));assert.ok(!JSON.stringify(result).includes(env.DATABASE_URL));
 });
});

test('actual standalone and legacy check-cloud CLI refuse safely without token or remote access',()=>{
 for(const script of ['src/scripts/check-recette-neon-cloud.mts','src/scripts/provision-recette-fictional.mts']){
  const child=spawnSync(process.execPath,['--import','tsx',script,...args],{env:{...env,VERCEL_ENV:'production'},encoding:'utf8'});
  assert.equal(child.status,1);assert.equal(JSON.parse(child.stdout).status,'PRECHECK_REFUSED');
  assert.equal(child.stderr,'');assert.ok(!child.stdout.includes(env.NEON_API_KEY));
 }
});
