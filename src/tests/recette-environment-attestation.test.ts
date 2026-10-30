import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {neonConfig} from '@neondatabase/serverless';
import {attestRecetteEnvironment} from '../lib/recette/environment-attestation';
const project='prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',team='team_0BeqOAO8t5oDEBdzHHdekcxv',environment='env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM';
const values={DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic-password@ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require',
 CLARA_RECETTE_NEON_HOST:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',CLARA_RECETTE_NEON_BRANCH_ID:'br-crimson-feather-b2zr00sf',CLARA_RECETTE_MODE:'isolated-v1'};
const credentials={vercelToken:'synthetic-vercel-secret',neonKey:'synthetic-neon-secret'};
test('effective Environment attestation: fail closed before SQL; real SDK with simulated control planes and readonly SQL',async t=>{
 const previous=neonConfig.fetchFunction;t.after(()=>{neonConfig.fetchFunction=previous;});
 let mode='ok',calls:string[]=[],sqlCalls=0,secretReads=0;
 const records=()=>Object.entries(values).map(([key,value])=>({id:key,key,value,type:'encrypted',decrypted:true,customEnvironmentIds:[environment]}));
 const http:typeof fetch=async(url,init)=>{
  assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.ok(init?.signal);calls.push(String(url));
  if(mode==='network')throw Error(values.DATABASE_URL+credentials.vercelToken);
  if(mode==='403')return new Response('',{status:403});
  const u=new URL(String(url));
  if(u.hostname==='console.neon.tech'){
   assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer '+credentials.neonKey);
   return Response.json({endpoints:[{host:values.CLARA_RECETTE_NEON_HOST,branch_id:mode==='foreign-branch'?'main':values.CLARA_RECETTE_NEON_BRANCH_ID}]});
  }
  assert.equal(u.hostname,'api.vercel.com');assert.equal(u.searchParams.get('teamId'),team);
  if(u.pathname==='/v9/projects/'+project)return Response.json({id:mode==='project'?'foreign':project,accountId:team,name:'clara-os-recette'});
  if(u.pathname.endsWith('/custom-environments'))return Response.json({environments:[{id:mode==='environment'?'foreign':environment,slug:'clara-os-recette'}]});
  if(u.pathname.startsWith('/v10/')){
   assert.equal(u.searchParams.get('decrypt'),'false');assert.equal(u.searchParams.get('customEnvironmentId'),environment);
   const envs=records();
   if(mode==='postgres')envs.push({...envs[0],id:'fallback',key:'POSTGRES_URL'});
   if(mode==='override')envs.push({...envs[0],id:'override',key:'VERCEL_ENV'});
   if(mode==='duplicate')envs.push({...envs[0]});
   if(mode==='missing')envs.splice(0,1);
   if(mode==='production-target')Object.assign(envs[0],{target:['production']});
   if(mode==='sensitive')envs[0].type='sensitive';
   if(mode==='inherited')envs[0].customEnvironmentIds=[];
   return Response.json({envs,pagination:mode==='pagination'?{next:1}:undefined});
  }
  assert(u.pathname.startsWith('/v1/projects/'+project+'/env/'));secretReads++;
  const id=u.pathname.split('/').at(-1);const e=records().find(e=>e.id===id)!;
  if(mode==='encrypted')e.decrypted=false;
  if(mode==='plain')Object.assign(e,{type:'plain',decrypted:undefined});
  if(mode==='foreign-value')e.customEnvironmentIds=['foreign'];
  if(mode==='wrong-user'&&e.key==='DATABASE_URL')e.value=e.value.replace('clara_os_recette_limited','neondb_owner');
  if(mode==='production-host'&&e.key==='DATABASE_URL')e.value=e.value.replace('ep-aged-forest-b2wayach','ep-production');
  return Response.json(e);
 };
 neonConfig.fetchFunction=async(_url,init)=>{
  sqlCalls++;assert.equal(new Headers(init?.headers).get('Neon-Batch-Read-Only'),'true');
  const batch=JSON.parse(String(init?.body));assert.equal(batch.queries.length,1);assert.match(batch.queries[0].query,/^SELECT/);
  let row:Record<string,unknown>;
  if(batch.queries[0].query.includes('current_database()'))row={db:'neondb',role:mode==='owner'?'neondb_owner':'clara_os_recette_limited',rolsuper:mode==='admin',rolbypassrls:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,schema_create:false,database_create:false};
  else{
   assert.match(batch.queries[0].query,/has_table_privilege/);assert.match(batch.queries[0].query,/has_function_privilege/);assert.match(batch.queries[0].query,/pg_has_role/);
   row={no_admin_membership:mode!=='membership',schema_usage:true,no_object_ownership:mode!=='ownership',runtime_table_permissions:mode!=='table',runtime_function_permissions:mode!=='function'};
  }
  if(mode==='sql-network')throw Error(values.DATABASE_URL);
  return Response.json({results:[{fields:Object.keys(row).map(name=>({name,dataTypeID:3802})),rows:[Object.values(row).map(v=>JSON.stringify(v))]}]});
 };
 const run=async(m:string)=>{mode=m;calls=[];sqlCalls=0;secretReads=0;return attestRecetteEnvironment(credentials,http);};
 await t.test('missing secure access does not make any request',async()=>{assert.equal(await attestRecetteEnvironment({},http),'NON ATTESTÉ');assert.equal(calls.length,0);});
 await t.test('positive uses Vercel values, never local DATABASE_URL, then readonly role and permissions',async()=>{assert.equal(await run('ok'),'PASS');assert.equal(secretReads,4);assert.equal(sqlCalls,2);assert.equal(await run('plain'),'PASS');});
 await t.test('foreign projects, targets, database users, hosts, branches and fallback refused before SQL',async()=>{
  for(const m of ['project','environment','postgres','override','wrong-user','production-host','production-target','foreign-branch']){assert.equal(await run(m),'FAIL',m);assert.equal(sqlCalls,0,m);}
 });
 await t.test('ambiguous/missing/inherited/unreadable values never attest or connect',async()=>{
  for(const m of ['duplicate','missing','inherited','encrypted','foreign-value','pagination','network','403']){assert.equal(await run(m),'NON ATTESTÉ',m);assert.equal(sqlCalls,0,m);}
 });
 await t.test('owner/admin, inherited administration, ownership, missing table or EXECUTE rights refused',async()=>{
  for(const m of ['owner','admin','membership','ownership','table','function'])assert.equal(await run(m),'FAIL',m);
 });
 await t.test('sensitive binding uses no decryption request and requires Vercel execution',async()=>{
  assert.equal(await run('sensitive'),'NON ATTESTÉ');assert.equal(secretReads,0);assert.equal(sqlCalls,0);
 });
 await t.test('SQL unavailable is not attested; output has no details or secrets',async()=>{
  assert.equal(await run('sql-network'),'NON ATTESTÉ');
  for(const m of ['ok','owner','403']){const result=await run(m);assert(['PASS','FAIL','NON ATTESTÉ'].includes(result));for(const v of [...Object.values(values),...Object.values(credentials)])assert(!result.includes(v));}
 });
});
test('workflow attaches readonly checks to dedicated Environment before conditional deployment',()=>{
 const workflow=readFileSync('.github/workflows/clara-os-independent-recette.yml','utf8');
 assert.match(workflow,/environment: clara-os-recette/);assert.match(workflow,/secrets.VERCEL_RECETTE_TOKEN/);assert.match(workflow,/secrets.NEON_API_KEY/);
 assert(workflow.indexOf('id: metadata_preflight')<workflow.indexOf('name: Deploy only custom'));
 assert.match(workflow,/path: .recette-controller/);assert.match(workflow,/ref: \$\{\{ github.sha \}\}/);
 assert.match(workflow,/writesAuthorized:true/);assert.match(workflow,/steps.release_authorization.outcome/);assert.match(workflow,/APPROVED_CONTROLLER_SHA_MISMATCH/);assert.match(workflow,/inputs.verify_only == false/);assert.match(workflow,/verify-recette-ci.mjs/);
 const script=readFileSync('src/scripts/attest-recette-environment.mts','utf8');assert(!script.includes('console.error'));assert(!script.includes('DATABASE_URL'));
});
