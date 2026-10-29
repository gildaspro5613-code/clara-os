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

// Seven read endpoints intentionally remain unchanged. Only the error loses its ambiguity.
const metadataPaths=new Map([
 ['/v9/projects/prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz','VERCEL_PROJECT'],
 ['/projects/prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz/custom-environments','VERCEL_CUSTOM_ENVIRONMENT'],
 ['/v10/projects/prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz/env','VERCEL_BINDINGS'],
 ['/v9/projects/prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz/domains','VERCEL_DOMAINS'],
 ['/v4/aliases/clara-os-recette.vercel.app','VERCEL_ALIAS'],
 ['/v13/deployments/dpl_existing','VERCEL_ALIAS_DEPLOYMENT'],
 ['/api/v2/projects/fragrant-dream-31652403/endpoints','NEON_ENDPOINTS'],
]);
function metadataBody(path){
 if(path.endsWith('/endpoints'))return {endpoints:[{host:'ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',branch_id:'br-crimson-feather-b2zr00sf'}]};
 if(path.endsWith('/custom-environments'))return {environments:[{id:env,slug:'clara-os-recette'}]};
 if(path.endsWith('/domains'))return {domains:[{name:'clara-os-recette.vercel.app'}]};
 if(path.startsWith('/v4/aliases/'))return {alias:'clara-os-recette.vercel.app',projectId:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',deploymentId:'dpl_existing'};
 if(path.startsWith('/v13/deployments/'))return {id:'dpl_existing',projectId:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',ownerId:'team_0BeqOAO8t5oDEBdzHHdekcxv',target:'preview',readyState:'READY',customEnvironment:{id:env,slug:'clara-os-recette'}};
 if(path.endsWith('/env'))return {envs:['DATABASE_URL','CLARA_RECETTE_NEON_HOST','CLARA_RECETTE_NEON_BRANCH_ID','CLARA_RECETTE_MODE','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','CLARA_AUTH_GOOGLE_REDIRECT_URI','CLARA_AUTH_APP_ORIGIN'].map(key=>({key,customEnvironmentIds:[env]}))};
 return {id:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',accountId:'team_0BeqOAO8t5oDEBdzHHdekcxv',name:'clara-os-recette'};
}
import {MetadataAccessUnavailable,formatMetadataFailure} from './verify-recette-metadata.mjs';
import {execFileSync} from 'node:child_process';
test('baseline 950b3d3 conflates missing credentials and an HTTP refusal: original cause is not recoverable from the label',async()=>{
 const baseline=execFileSync('git',['show','950b3d3df42a7965f6d0688e0bedc879ad330ea9:.github/scripts/verify-recette-metadata.mjs'],{encoding:'utf8'});
 const old=await import('data:text/javascript;base64,'+Buffer.from(baseline).toString('base64'));
 for(const input of [{vercelToken:'',neonKey:'synthetic'},{vercelToken:'synthetic',neonKey:''},{vercelToken:'synthetic',neonKey:'synthetic',http:async()=>new Response('',{status:403})}]){
  await assert.rejects(old.verifyRecetteMetadata(input),e=>e.message==='METADATA_ACCESS_UNAVAILABLE');
 }
 for(const http of [async()=>{throw Error('synthetic-network');},async()=>new Response('invalid-json')]){
  await assert.rejects(old.verifyRecetteMetadata({vercelToken:'synthetic',neonKey:'synthetic',http}),e=>e.message!=='METADATA_ACCESS_UNAVAILABLE');
 }
});
test('each non-success HTTP response reports its exact stage/status without body or retry',async t=>{
 for(const stage of metadataPaths.values())for(const status of [401,403,404,429,503])await t.test(stage+' '+status,async()=>{
  const seen=[];const http=async(url,init)=>{
   assert.equal(init.method,'GET');assert.equal(init.redirect,'error');const path=new URL(url).pathname;seen.push(metadataPaths.get(path));
   return metadataPaths.get(path)===stage?new Response('synthetic-secret private-provider-body',{status}):Response.json(metadataBody(path));
  };
  await assert.rejects(verifyRecetteMetadata({vercelToken:'synthetic-secret',neonKey:'synthetic-secret',http}),error=>{
   assert.equal(formatMetadataFailure(error),'METADATA_ACCESS_UNAVAILABLE stage='+stage+' kind=HTTP http='+status);
   assert.equal(seen.at(-1),stage);assert.equal(seen.filter(s=>s===stage).length,1);return true;
  });
 });
});
test('missing secrets are distinguished without HTTP or disclosure',async()=>{
 let calls=0;const http=async()=>{calls++;throw Error('MUST_NOT_CALL');};
 for(const [input,stage] of [[{vercelToken:'',neonKey:'synthetic'},'VERCEL_RECETTE_TOKEN'],[{vercelToken:'synthetic',neonKey:''},'NEON_API_KEY']]){
  await assert.rejects(verifyRecetteMetadata({...input,http}),error=>formatMetadataFailure(error)==='METADATA_ACCESS_UNAVAILABLE stage='+stage+' kind=MISSING_SECRET');
 }
 assert.equal(calls,0);
});
test('transport, timeout and invalid JSON do not reflect errors or trigger retries',async()=>{
 for(const mode of ['TRANSPORT','TIMEOUT','INVALID_JSON']){
  let calls=0;const http=async()=>{calls++;if(mode==='INVALID_JSON')return new Response('synthetic-secret-not-json');const e=Error('synthetic-secret https://private:password@example.invalid');if(mode==='TIMEOUT')e.name='TimeoutError';throw e;};
  await assert.rejects(verifyRecetteMetadata({vercelToken:'synthetic-secret',neonKey:'synthetic-secret',http}),error=>{
   assert.equal(formatMetadataFailure(error),'METADATA_ACCESS_UNAVAILABLE stage=VERCEL_PROJECT kind='+mode);return true;
  });assert.equal(calls,1);
 }
 const untrusted=new MetadataAccessUnavailable('synthetic-secret','synthetic-secret','synthetic-secret');
 assert.equal(formatMetadataFailure(untrusted),'METADATA_ACCESS_UNAVAILABLE stage=UNKNOWN kind=UNKNOWN');
 assert.equal(formatMetadataFailure(Error('synthetic-secret')),'METADATA_REFUSED');
});
