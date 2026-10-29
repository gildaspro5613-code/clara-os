import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRecetteCI} from './verify-recette-ci.mjs';
import {verifyRecetteMetadata} from './verify-recette-metadata.mjs';
const sha='a'.repeat(40),env='env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM';
test('CI requires five successful completed controls and exact current branch; never writes',async()=>{
 for(const mode of ['ok','pending','failed','missing','branch','status','transport']){
  let calls=0;
  const http=async(url,init)=>{
   calls++;assert.equal(init.method,'GET');assert.equal(init.redirect,'error');
   if(mode==='transport')return new Response('',{status:403});
   if(url.includes('/git/ref/'))return Response.json({object:{sha:mode==='branch'?'foreign':sha}});
   if(url.includes('check-runs'))return Response.json({total_count:6,check_runs:[...Array.from({length:mode==='missing'?4:5},(_,i)=>({status:mode==='pending'&&i===0?'in_progress':'completed',conclusion:mode==='failed'&&i===0?'failure':'success',details_url:'https://github.com/example/ci/'+i})),{status:'in_progress',details_url:'https://github.com/gildaspro5613-code/clara-os/actions/runs/123/job/4'}]});
   return Response.json({total_count:mode==='status'?1:0,state:mode==='status'?'failure':'pending'});
  };
  const operation=verifyRecetteCI({token:'synthetic',sha,runId:'123',http});
  if(mode==='ok'||mode==='ok-null')assert.equal(await operation,'PASS');else await assert.rejects(operation);
  assert(calls<=3);
 }
});
test('metadata: exact project, target, all four scoped variables and authorized Neon host before any build',async()=>{
 for(const mode of ['ok','ok-null','project','target','missing','fallback','override','scope','domain','branch','network','alias-project','alias-redirect','alias-target','google-missing']){
  const http=async(url,init)=>{
   assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert(!String(url).includes('/v1/projects/'));assert(!String(url).includes('decrypt=true'));
   if(mode==='network')throw Error('synthetic-secret');
   const path=new URL(String(url)).pathname;
   if(path.startsWith('/v4/aliases/'))return Response.json({alias:'clara-os-recette.vercel.app',projectId:mode==='ok-null'?null:mode==='alias-project'?'foreign':'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',deploymentId:'dpl_existing',redirect:mode==='alias-redirect'?'https://os.melodie.digital':null});
   if(path==='/v13/deployments/dpl_existing')return Response.json({id:'dpl_existing',projectId:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',ownerId:'team_0BeqOAO8t5oDEBdzHHdekcxv',target:mode==='alias-target'?'production':'preview',readyState:'READY',customEnvironment:{id:env,slug:'clara-os-recette'}});
   if(path.includes('/endpoints'))return Response.json({endpoints:[{host:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',branch_id:mode==='branch'?'main':'br-crimson-feather-b2zr00sf'}]});
   if(path.endsWith('/custom-environments'))return Response.json({environments:[{id:mode==='target'?'foreign':env,slug:'clara-os-recette'}]});
   if(path.endsWith('/domains'))return Response.json({domains:[{name:mode==='domain'?'os.melodie.digital':'clara-os-recette.vercel.app'}]});
   if(path.endsWith('/env')){
    const envs=['DATABASE_URL','CLARA_RECETTE_NEON_HOST','CLARA_RECETTE_NEON_BRANCH_ID','CLARA_RECETTE_MODE','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','CLARA_AUTH_GOOGLE_REDIRECT_URI','CLARA_AUTH_APP_ORIGIN'].map(key=>({key,type:'sensitive',customEnvironmentIds:[mode==='scope'?'foreign':env]}));
    if(mode==='google-missing')envs.splice(envs.findIndex(e=>e.key==='GOOGLE_CLIENT_ID'),1);
    if(mode==='missing')envs.pop();if(mode==='fallback')envs.push({key:'POSTGRES_URL'});if(mode==='override')envs.push({key:'VERCEL_ENV'});
    return Response.json({envs});
   }
   return Response.json({id:mode==='project'?'foreign':'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',accountId:'team_0BeqOAO8t5oDEBdzHHdekcxv',name:'clara-os-recette'});
  };
  const operation=verifyRecetteMetadata({vercelToken:'synthetic',neonKey:'synthetic',http});
  if(mode==='ok'||mode==='ok-null')assert.equal(await operation,'PASS');else await assert.rejects(operation);
 }
});
