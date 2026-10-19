import test from 'node:test';
import assert from 'node:assert/strict';
import {neonConfig} from '@neondatabase/serverless';
import {attestRecetteRuntime} from '../lib/recette/runtime-attestation';
const sha='a'.repeat(40);
const env={VERCEL_PROJECT_ID:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',VERCEL_DEPLOYMENT_ID:'dpl_synthetic',VERCEL_TARGET_ENV:'clara-os-recette',VERCEL_ENV:'preview',
 CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_NEON_HOST:'ep-test.eu-central-1.aws.neon.tech',
 DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic-password@ep-test.eu-central-1.aws.neon.tech/neondb?sslmode=require',VERCEL_TOKEN:'synthetic-vercel-token',NEON_API_KEY:'synthetic-neon-key'};

test('attestation: real SDK, simulated control planes and READ ONLY SQL; no secret or fingerprint in reports',async t=>{
 const previous=neonConfig.fetchFunction;t.after(()=>{neonConfig.fetchFunction=previous;});let sqlCalls=0,httpCalls=0,mode='ok';
 neonConfig.fetchFunction=async (_url,init)=>{
  sqlCalls++;assert.equal(new Headers(init?.headers).get('Neon-Batch-Read-Only'),'true');
  const batch=JSON.parse(String(init?.body));assert.equal(batch.queries.length,1);assert.match(batch.queries[0].query,/^SELECT/);
  const row={db:'neondb',role:mode==='sql'?'neondb_owner':'clara_os_recette_limited',rolsuper:false,rolbypassrls:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,schema_create:false,database_create:false};
  const names=Object.keys(row);return Response.json({results:[{fields:names.map(name=>({name,dataTypeID:3802})),rows:[Object.values(row).map(v=>JSON.stringify(v))]}]});
 };
 const http:typeof fetch=async(url,init)=>{
  httpCalls++;assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');
  if(mode==='unavailable')throw Error(env.DATABASE_URL+env.VERCEL_TOKEN);
  if(String(url).includes('/deployments/'))return Response.json({projectId:env.VERCEL_PROJECT_ID,target:'preview',customEnvironment:mode==='target'?undefined:{slug:'clara-os-recette'},gitSource:{sha:mode==='sha'?'b'.repeat(40):sha}});
  if(String(url).includes('/projects/prj_'))return Response.json({id:env.VERCEL_PROJECT_ID,name:'clara-os-recette'});
  assert.equal(String(url),'https://console.neon.tech/api/v2/projects/fragrant-dream-31652403/endpoints');
  return Response.json({endpoints:[{host:env.CLARA_RECETTE_NEON_HOST,branch_id:mode==='branch'?'main':env.CLARA_RECETTE_NEON_BRANCH_ID}]});
 };
 await t.test('missing effective bindings are not attested, zero transport',async()=>{
  assert.equal((await attestRecetteRuntime({},sha,http)).status,'NON ATTESTÉ');assert.equal(httpCalls+sqlCalls,0);
 });
 await t.test('production, URL override or fallback are refused before any API or SQL',async()=>{
  for(const change of [{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'other'},{CLARA_RECETTE_NEON_BRANCH_ID:'main'},{POSTGRES_URL:''},{DATABASE_URL:env.DATABASE_URL+'&options=unsafe'}])
   assert.equal((await attestRecetteRuntime({...env,...change},sha,http)).status,'FAIL');
  assert.equal(httpCalls+sqlCalls,0);
 });
 await t.test('unproven source/target and foreign branch never connect to SQL',async()=>{
  for(mode of ['sha','target','branch'])assert.notEqual((await attestRecetteRuntime(env,sha,http)).status,'PASS');assert.equal(sqlCalls,0);
 });
 await t.test('positive attestation requires actual readonly SQL role result; owner is refused',async()=>{
  mode='ok';assert.equal((await attestRecetteRuntime(env,sha,http)).status,'PASS');assert.equal(sqlCalls,1);
  mode='sql';assert.equal((await attestRecetteRuntime(env,sha,http)).status,'FAIL');
 });
 await t.test('unavailable permissions/transport never pass or expose exception values',async()=>{
  mode='unavailable';const result=await attestRecetteRuntime(env,sha,http);assert.equal(result.status,'NON ATTESTÉ');
  for(const secret of [env.DATABASE_URL,env.VERCEL_TOKEN,env.NEON_API_KEY,sha])assert.ok(!JSON.stringify(result).includes(secret));
 });
});
