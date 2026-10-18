import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {neon,neonConfig} from '@neondatabase/serverless';
import {cloudRecetteFixtureToken,fixture,newRecetteFixtureToken,seedRecetteFixture} from '../lib/recette/fixture-provisioning';

// Protocol simulation using the installed, unmodified SDK. Not a Neon service test.
const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'clara-os-recette',CLARA_RECETTE_MODE:'isolated-v1',
 CLARA_RECETTE_NEON_HOST:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',CLARA_RECETTE_NEON_BRANCH_ID:fixture.branch,
 DATABASE_URL:'postgresql://clara_os_recette_limited:synthetic@ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require',
 GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',RECETTE_FIXTURE_SESSION_TOKEN:newRecetteFixtureToken()};

test('Cloud input is explicit, canonical and unavailable in Production or unattended runs',()=>{
 assert.equal(cloudRecetteFixtureToken(env),env.RECETTE_FIXTURE_SESSION_TOKEN);
 for(const changed of [{VERCEL_ENV:'production'},{VERCEL_TARGET_ENV:'production'},{GITHUB_ACTIONS:''},
  {GITHUB_EVENT_NAME:'push'},{RECETTE_FIXTURE_SESSION_TOKEN:''},{RECETTE_FIXTURE_SESSION_TOKEN:'invalid'}])
  assert.throws(()=>cloudRecetteFixtureToken({...env,...changed}));
});

test('installed Neon SDK sends one Serializable HTTP batch, parses DO/INSERT results, never retries failures',async t=>{
 const original=neonConfig.fetchFunction;t.after(()=>{neonConfig.fetchFunction=original;});
 let calls=0,fail=false;
 neonConfig.fetchFunction=async (_url,init)=>{
  calls++;
  const headers=new Headers(init?.headers);
  assert.equal(headers.get('Neon-Batch-Isolation-Level'),'Serializable');
  const body=JSON.parse(String(init?.body));
  assert.equal(body.queries.length,5);
  assert.match(body.queries[0].query,/pg_advisory_xact_lock/);
  assert.match(body.queries[1].query,/DO \$\$/);
  assert.match(body.queries[2].query,/set_config/);
  assert.match(body.queries[3].query,/current_setting/);
  assert.ok(!String(init?.body).includes(env.RECETTE_FIXTURE_SESSION_TOKEN));
  if(fail)return Response.json({message:'synthetic serialization failure',code:'40001'},{status:400});
  return Response.json({results:[
   {command:'SELECT',fields:[{name:'pg_advisory_xact_lock',dataTypeID:2278}],rows:[['']],rowCount:1},
   {command:'DO',fields:[],rows:[],rowCount:null},
   {command:'SELECT',fields:[{name:'set_config',dataTypeID:25}],rows:[['synthetic-digest']],rowCount:1},
   {command:'DO',fields:[],rows:[],rowCount:null},
   {command:'INSERT',fields:[],rows:[],rowCount:1},
  ]});
 };
 const sql=neon(env.DATABASE_URL);
 const results=await seedRecetteFixture(sql,env.RECETTE_FIXTURE_SESSION_TOKEN);
 assert.equal(calls,1);assert.deepEqual(results[1],[]);assert.deepEqual(results[4],[]);
 fail=true;
 await assert.rejects(seedRecetteFixture(sql,env.RECETTE_FIXTURE_SESSION_TOKEN),{code:'40001'});
 assert.equal(calls,2); // no automatic retry or false successful receipt
});

test('real Cloud CLI stops before transport without authorized configuration; logs contain no input secrets',()=>{
 for(const override of [{VERCEL_ENV:'production'},{GITHUB_EVENT_NAME:'push'},{CLARA_RECETTE_NEON_HOST:'ep-wrong-host.c-6.eu-central-1.aws.neon.tech'}]){
  const result=spawnSync(process.execPath,['--import','tsx','src/scripts/provision-recette-fictional.mts',
   '--apply-cloud',`--confirm=${fixture.branch}`],{env:{...env,...override},encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/RECETTE_PROVISIONING_STOPPED/);
  assert.ok(!(result.stdout+result.stderr).includes(env.RECETTE_FIXTURE_SESSION_TOKEN));
  assert.ok(!(result.stdout+result.stderr).includes(env.DATABASE_URL));
 }
 const plan=spawnSync(process.execPath,['--import','tsx','src/scripts/provision-recette-fictional.mts','--plan'],{env:{},encoding:'utf8'});
 assert.equal(plan.status,0);assert.match(plan.stdout,/PLAN ONLY/);
});
