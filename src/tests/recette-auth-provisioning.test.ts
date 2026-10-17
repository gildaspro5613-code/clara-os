import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile,execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {neon,neonConfig} from '@neondatabase/serverless';
import {fixture,preflightRecetteFixture,seedRecetteFixture,newRecetteFixtureToken} from '../lib/recette/fixture-provisioning';
import {GET as registry} from '../app/api/canonical/registry/route';
import {POST as redeem} from '../app/api/auth/recette/session/route';

const url='postgresql://clara_os_recette_limited:synthetic@ep-recette-test.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_HOST:'ep-recette-test.eu-central-1.aws.neon.tech',CLARA_RECETTE_NEON_BRANCH_ID:fixture.branch,DATABASE_URL:url,NEON_API_KEY:'synthetic-metadata-token'};
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const quote=(v:unknown)=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";

test('offline fictional provisioning and real canonical auth handlers on disposable PostgreSQL; no Neon or provider',async t=>{
 const container='recette-auth-'+randomUUID().replaceAll('-','');
 const pg=(statement:string,user='postgres')=>{
  try{return execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U',user,'-d','neondb','-v','ON_ERROR_STOP=1'],{input:statement,encoding:'utf8',stdio:['pipe','pipe','pipe']});}
  catch(error){throw Error(String((error as {stderr?:unknown}).stderr).match(/RECETTE_FIXTURE_[A-Z_]+/)?.[0]??'TEST_SQL_FAILED');}
 };
 execFileSync('docker',['run','-d','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{stdio:'pipe'});
 const initialFetch=neonConfig.fetchFunction, initialEnv={...process.env};
 t.after(()=>{neonConfig.fetchFunction=initialFetch;for(const k of Object.keys(env))delete process.env[k];Object.assign(process.env,Object.fromEntries(Object.keys(env).filter(k=>initialEnv[k]!==undefined).map(k=>[k,initialEnv[k]])));if(initialEnv.CLARA_AUTH_APP_ORIGIN===undefined)delete process.env.CLARA_AUTH_APP_ORIGIN;else process.env.CLARA_AUTH_APP_ORIGIN=initialEnv.CLARA_AUTH_APP_ORIGIN;execFileSync('docker',['rm','-f',container],{stdio:'pipe'});});
 let ready=false;for(let n=0;n<40;n++){try{execFileSync('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'pipe'});ready=true;break;}catch{await new Promise(r=>setTimeout(r,250));}}
 assert.ok(ready);
 execFileSync('docker',['exec',container,'createdb','-U','postgres','neondb'],{stdio:'pipe'});
 // Minimal disposable AUTH schema only: no migration file or real branch is used.
 pg(`CREATE ROLE clara_os_recette_limited LOGIN;
 CREATE TABLE clara_auth_users(id text PRIMARY KEY);
 CREATE TABLE clara_auth_workspaces(id text PRIMARY KEY);
 CREATE TABLE clara_auth_identities(issuer text,subject text,user_id text REFERENCES clara_auth_users,PRIMARY KEY(issuer,subject));
 CREATE TABLE clara_workspace_memberships(user_id text REFERENCES clara_auth_users,workspace_id text REFERENCES clara_auth_workspaces,role text,revoked_at timestamptz,PRIMARY KEY(user_id,workspace_id));
 CREATE TABLE clara_auth_sessions(token_hash text PRIMARY KEY,user_id text REFERENCES clara_auth_users,created_at timestamptz DEFAULT now(),expires_at timestamptz CHECK(expires_at>created_at),revoked_at timestamptz);
 GRANT USAGE ON SCHEMA public TO clara_os_recette_limited;
 GRANT SELECT(id),INSERT(id) ON clara_auth_users,clara_auth_workspaces TO clara_os_recette_limited;
 GRANT SELECT(issuer,subject,user_id),INSERT(issuer,subject,user_id) ON clara_auth_identities TO clara_os_recette_limited;
 GRANT SELECT(user_id,workspace_id,role,revoked_at),INSERT(user_id,workspace_id,role) ON clara_workspace_memberships TO clara_os_recette_limited;
 GRANT SELECT(token_hash,user_id,expires_at,revoked_at),INSERT(token_hash,user_id,expires_at) ON clara_auth_sessions TO clara_os_recette_limited;`);
 let sqlCalls=0,writeBatches=0;
 neonConfig.fetchFunction=async (_input,init)=>{
  sqlCalls++;const body=JSON.parse(String(init?.body));
  const requests: {query:string;params:unknown[]}[]=body.queries??[body];
  let script=body.queries?'BEGIN ISOLATION LEVEL SERIALIZABLE;\n':'';
  for(let i=0;i<requests.length;i++){
   const q=requests[i].query.replace(/\$(\d+)/g,(_,n)=>quote(requests[i].params[Number(n)-1]));
   if(/^\s*SELECT/i.test(q))script+=`SELECT json_build_object('rows',COALESCE(json_agg(row_to_json(r)),'[]'::json)) FROM (${q})r;\n`;
   else script+=q+`;SELECT '{"rows":[]}'::json;\n`;
  }
  if(body.queries){writeBatches++;script+='COMMIT;';}
  const output=await new Promise<string>((resolve,reject)=>{
   const child=execFile('docker',['exec','-i',container,'psql','-X','-qAt','-U','clara_os_recette_limited','-d','neondb','-v','ON_ERROR_STOP=1'],{encoding:'utf8'},(error,stdout)=>error?reject(Error('TEST_SQL_FAILED')):resolve(stdout));
   child.stdin!.end(script);
  });
  const results=output.trim().split('\n').filter(Boolean).map(line=>{
   const rows=JSON.parse(line).rows as Record<string,unknown>[];const names=Object.keys(rows[0]??{});
   return {fields:names.map(name=>({name,dataTypeID:3802})),rows:rows.map(row=>names.map(name=>JSON.stringify(row[name]))),rowCount:rows.length,command:'SELECT',rowAsArray:true};
  });
  return Response.json(body.queries?{results}:results[0]);
 };
 Object.assign(process.env,env,{CLARA_AUTH_APP_ORIGIN:'https://recette.invalid'});delete process.env.POSTGRES_URL;
 const query=neon(url);
 const metadata:typeof fetch=async()=>Response.json({endpoints:[{host:env.CLARA_RECETTE_NEON_HOST,branch_id:fixture.branch}]});
 const token=newRecetteFixtureToken();assert.notEqual(token,newRecetteFixtureToken());
 const get=(value?:string)=>registry(new Request('https://recette.invalid/api/canonical/registry',{headers:value?{cookie:'clara_auth_session='+value}:{}}));
 const login=(value:string)=>redeem(new Request('https://recette.invalid/api/auth/recette/session',{method:'POST',headers:{origin:'https://recette.invalid','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({workspaceId:fixture.workspace,token:value})}));
 await t.test('missing session is 401; false branch, target and metadata are refused before SQL or writes',async()=>{
  assert.equal((await get()).status,401);
  const before=sqlCalls;
  await assert.rejects(preflightRecetteFixture({...env,CLARA_RECETTE_NEON_BRANCH_ID:'main'},query,metadata),/RECETTE_DATABASE_REFUSED/);
  await assert.rejects(preflightRecetteFixture({...env,VERCEL_ENV:'production'},query,metadata),/RECETTE_CONFIGURATION_REFUSED/);
  await assert.rejects(preflightRecetteFixture(env,query,async()=>Response.json({endpoints:[{host:env.CLARA_RECETTE_NEON_HOST,branch_id:'other'}]})),/RECETTE_ENDPOINT_BRANCH_UNPROVEN/);
  assert.equal(sqlCalls,before);assert.equal(writeBatches,0);
 });
 await t.test('real limited role preflight; absent INSERT privilege stops before writes',async()=>{
  pg('REVOKE INSERT(issuer,subject,user_id) ON clara_auth_identities FROM clara_os_recette_limited');
  await assert.rejects(preflightRecetteFixture(env,query,metadata),/RECETTE_PROVISIONING_PRIVILEGES_REQUIRED/);assert.equal(writeBatches,0);
  pg('GRANT INSERT(issuer,subject,user_id) ON clara_auth_identities TO clara_os_recette_limited');
  await preflightRecetteFixture(env,query,metadata);
 });
 await t.test('missing function EXECUTE is refused before any fixture writes',async()=>{
  pg('REVOKE EXECUTE ON FUNCTION pg_catalog.set_config(text,text,boolean) FROM PUBLIC');
  await assert.rejects(preflightRecetteFixture(env,query,metadata),/RECETTE_PROVISIONING_CAPABILITIES_REQUIRED/);
  assert.equal(writeBatches,0);
  pg('GRANT EXECUTE ON FUNCTION pg_catalog.set_config(text,text,boolean) TO PUBLIC');
 });
 await t.test('table ownership and occupied fictional identity are refused without reassignment',async()=>{
  pg('ALTER TABLE clara_auth_users OWNER TO clara_os_recette_limited');
  await assert.rejects(preflightRecetteFixture(env,query,metadata),/RECETTE_PROVISIONING_CAPABILITIES_REQUIRED/);
  // PostgreSQL rewrites owner ACL entries; restore the disposable column grants.
  pg('ALTER TABLE clara_auth_users OWNER TO postgres;GRANT SELECT(id),INSERT(id) ON clara_auth_users TO clara_os_recette_limited');
  await preflightRecetteFixture(env,query,metadata);
  pg(`INSERT INTO clara_auth_users VALUES('collision');INSERT INTO clara_auth_identities VALUES(${quote(fixture.issuer)},${quote(fixture.subject)},'collision')`);
  await assert.rejects(seedRecetteFixture(query,token));
  assert.equal(pg(`SELECT count(*) FROM clara_auth_users WHERE id=${quote(fixture.user)}`).trim(),'0');
  assert.equal(pg('SELECT user_id FROM clara_auth_identities').trim(),'collision');
  pg("DELETE FROM clara_auth_identities;DELETE FROM clara_auth_users WHERE id='collision'");
 });
 await t.test('late failure rolls back all preceding fixture inserts',async()=>{
  pg('ALTER TABLE clara_auth_sessions ADD CONSTRAINT test_failure CHECK(false)');
  await assert.rejects(seedRecetteFixture(query,token));
  assert.equal(pg('SELECT count(*) FROM clara_auth_users').trim(),'0');
  assert.equal(pg('SELECT count(*) FROM clara_auth_workspaces').trim(),'0');
  pg('ALTER TABLE clara_auth_sessions DROP CONSTRAINT test_failure');
 });
 await t.test('real concurrent database transactions create only one live token; lost acknowledgement replays safely',async()=>{
  const outcomes=await Promise.allSettled([seedRecetteFixture(query,token),seedRecetteFixture(query,newRecetteFixtureToken())]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(pg('SELECT count(*) FROM clara_auth_sessions').trim(),'1');
  // Whichever competing token won: remove only these disposable test rows, then
  // exercise a committed request whose HTTP acknowledgement was lost.
  pg('DELETE FROM clara_auth_sessions');
  const transport=neonConfig.fetchFunction;
  neonConfig.fetchFunction=async(...args)=>{await transport!(...args);throw Error('SIMULATED_LOST_ACK');};
  await assert.rejects(seedRecetteFixture(query,token));
  neonConfig.fetchFunction=transport;
  const expires=pg('SELECT expires_at FROM clara_auth_sessions');
  await seedRecetteFixture(neon(url),token); // fresh SDK instance, no process-local receipt
  assert.equal(pg('SELECT count(*) FROM clara_auth_sessions').trim(),'1');
  assert.equal(pg('SELECT expires_at FROM clara_auth_sessions'),expires);
 });
 await t.test('idempotent seed retains one user/workspace/session and expiry; canonical login and refresh work',async()=>{
  await seedRecetteFixture(query,token);
  const before=pg('SELECT json_build_array((SELECT count(*) FROM clara_auth_users),(SELECT count(*) FROM clara_auth_sessions),(SELECT expires_at FROM clara_auth_sessions))');
  await seedRecetteFixture(query,token);
  assert.equal(pg('SELECT json_build_array((SELECT count(*) FROM clara_auth_users),(SELECT count(*) FROM clara_auth_sessions),(SELECT expires_at FROM clara_auth_sessions))'),before);
  const response=await login(token);assert.equal(response.status,303);
  assert.match(response.headers.get('set-cookie')??'',/HttpOnly/);
  for(let i=0;i<2;i++){const loaded=await get(token);assert.equal(loaded.status,200);assert.deepEqual((await loaded.json()).data,[{workspace_id:fixture.workspace}]);}
  await assert.rejects(seedRecetteFixture(query,newRecetteFixtureToken()));
  assert.equal(pg('SELECT count(*) FROM clara_auth_sessions').trim(),'1');
 });
 await t.test('other user/workspace never leaks; missing and revoked membership refuse login and selector',async()=>{
  pg("INSERT INTO clara_auth_users VALUES('other');INSERT INTO clara_auth_workspaces VALUES('other');INSERT INTO clara_auth_identities VALUES('fixture','other','other');INSERT INTO clara_workspace_memberships VALUES('other','other','owner',NULL)");
  assert.deepEqual((await (await get(token)).json()).data,[{workspace_id:fixture.workspace}]);
  pg(`UPDATE clara_workspace_memberships SET revoked_at=now() WHERE user_id=${quote(fixture.user)}`);
  assert.equal((await login(token)).status,403);assert.deepEqual((await (await get(token)).json()).data,[]);
  await assert.rejects(seedRecetteFixture(query,token));
  // Test-owned rows only, restore for the next independent negative case.
  pg(`UPDATE clara_workspace_memberships SET revoked_at=NULL WHERE user_id=${quote(fixture.user)}`);
  pg(`DELETE FROM clara_workspace_memberships WHERE user_id=${quote(fixture.user)}`);
  assert.equal((await login(token)).status,403);assert.deepEqual((await (await get(token)).json()).data,[]);
  await assert.rejects(seedRecetteFixture(query,token));
  pg(`INSERT INTO clara_workspace_memberships VALUES(${quote(fixture.user)},${quote(fixture.workspace)},'owner',NULL)`);
 });
 await t.test('expired and revoked sessions are refused and never renewed by replay',async()=>{
  pg(`UPDATE clara_auth_sessions SET revoked_at=now() WHERE token_hash=${quote(hash(token))}`);
  assert.equal((await login(token)).status,403);assert.deepEqual((await (await get(token)).json()).data,[]);await assert.rejects(seedRecetteFixture(query,token));
  pg(`UPDATE clara_auth_sessions SET revoked_at=NULL,created_at=now()-interval '2 hours',expires_at=now()-interval '1 minute' WHERE token_hash=${quote(hash(token))}`);
  assert.equal((await login(token)).status,403);assert.deepEqual((await (await get(token)).json()).data,[]);await assert.rejects(seedRecetteFixture(query,token));
 });
});
