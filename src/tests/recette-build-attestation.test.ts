import test from 'node:test';
import assert from 'node:assert/strict';
import {neonConfig} from '@neondatabase/serverless';
import {attestRecetteBuildBindings} from '../lib/recette/build-attestation';
const env:NodeJS.ProcessEnv={NODE_ENV:'production',VERCEL_PROJECT_ID:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',VERCEL_TARGET_ENV:'clara-os-recette',VERCEL_ENV:'preview',
 CLARA_RECETTE_MODE:'isolated-v1',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_NEON_HOST:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',
 DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic-password@ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require'};
test('Vercel injected-binding component: readonly, no credential export and no declarative PASS',async t=>{
 const previous=neonConfig.fetchFunction;t.after(()=>{neonConfig.fetchFunction=previous;});let calls=0,mode='ok';
 neonConfig.fetchFunction=async(_url,init)=>{
  calls++;assert.equal(new Headers(init?.headers).get('Neon-Batch-Read-Only'),'true');
  const batch=JSON.parse(String(init?.body));assert.equal(batch.queries.length,1);const query=batch.queries[0].query;assert.match(query,/^SELECT/);
  if(mode==='network')throw Error(env.DATABASE_URL);
  const row=query.includes('current_database()')?
   {db:'neondb',role:mode==='owner'?'neondb_owner':'clara_os_recette_limited',rolsuper:false,rolbypassrls:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,schema_create:false,database_create:false}:
   {no_admin_membership:true,schema_usage:true,no_object_ownership:true,runtime_table_permissions:mode!=='permissions',runtime_function_permissions:true};
  return Response.json({results:[{fields:Object.keys(row).map(name=>({name,dataTypeID:3802})),rows:[Object.values(row).map(v=>JSON.stringify(v))]}]});
 };
 await t.test('wrong target, branch, host, database, role and fallback fail before SQL',async()=>{
  for(const change of [{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'foreign'},{VERCEL_TARGET_ENV:'preview'},{CLARA_RECETTE_NEON_BRANCH_ID:'main'},{POSTGRES_URL:''},
   {DATABASE_URL:env.DATABASE_URL!.replace('/neondb','/production')},{DATABASE_URL:env.DATABASE_URL!.replace('ep-aged-forest','ep-production')},
   {DATABASE_URL:env.DATABASE_URL!.replace('clara_os_recette_limited','neondb_owner')}])assert.equal(await attestRecetteBuildBindings({...env,...change}),'FAIL');
  assert.equal(calls,0);
 });
 await t.test('missing value cannot be replaced by an asserted PASS',async()=>{
  assert.equal(await attestRecetteBuildBindings({...env,DATABASE_URL:undefined,ATTESTATION:'PASS'}),'NON ATTESTÉ');assert.equal(calls,0);
 });
 await t.test('effective values and SQL privileges required, not just metadata',async()=>{
  assert.equal(await attestRecetteBuildBindings(env),'PASS');assert.equal(calls,2);
  mode='owner';assert.equal(await attestRecetteBuildBindings(env),'FAIL');
  mode='permissions';assert.equal(await attestRecetteBuildBindings(env),'FAIL');
  mode='network';assert.equal(await attestRecetteBuildBindings(env),'NON ATTESTÉ');
 });
});
