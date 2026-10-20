import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const workflow = readFileSync(new URL('../workflows/clara-os-independent-recette.yml',import.meta.url),'utf8');
const marker="node --input-type=module - <<'NODE_API'\n";
assert.equal(workflow.split(marker).length,2);
const code=workflow.split(marker)[1].split('\n          NODE_API')[0].split('\n').map(line=>line.slice(10)).join('\n');
const temporary=mkdtempSync(join(tmpdir(),'recette-git-api-offline-'));
writeFileSync(join(temporary,'driver.mjs'),code);
const {deployRecette,approvedGitSource,expected}=await import(pathToFileURL(join(temporary,'driver.mjs')).href);
test.after(()=>rmSync(temporary,{recursive:true,force:true}));
const link={type:'github',repoId:1316164838,org:'gildaspro5613-code',repo:'clara-os'};
const gitSource={type:'github',repoId:expected.repositoryId,ref:expected.sha,sha:expected.sha};
// Empty schedules are synthetic ONLY. The actual approved SHA is tested as refused below.
function fakeGit(args) {
 if(args[0]==='rev-parse') return Buffer.from(expected.sha+'\n');
 if(args[0]==='remote') return Buffer.from('https://github.com/gildaspro5613-code/clara-os\n');
 if(args[0]==='cat-file') return Buffer.from('commit\n');
 if(args[0]==='show') return Buffer.from('{"crons":[]}');
 throw Error('UNEXPECTED_GIT_OPERATION');
}
function harness({project,environment,create,poll,failPath,failStatus=403,timeout=false,git=fakeGit}={}) {
 const calls=[],events=[];
 const ready={id:'dpl_synthetic',url:'clara-os-recette-synthetic-melodie-digital.vercel.app',ownerId:expected.team,projectId:expected.project,
  customEnvironment:{id:expected.environment,slug:expected.slug},meta:{githubCommitSha:expected.sha},gitSource,readyState:'READY'};
 const http=async(url,init)=>{
  assert.equal(url.origin,'https://api.vercel.com');assert.equal(url.searchParams.get('teamId'),expected.team);
  assert.equal(init.headers.Authorization,'Bearer synthetic-restricted');assert.equal(init.redirect,'error');assert.ok(init.signal);
  calls.push({path:url.pathname,method:init.method,body:init.body});
  if(url.pathname===failPath) {if(timeout) throw Error('synthetic-restricted sensitive provider detail');return new Response('sensitive provider detail',{status:failStatus});}
  if(url.pathname==='/v9/projects/'+expected.project) return Response.json(project??{id:expected.project,name:expected.slug,accountId:expected.team,link});
  if(url.pathname==='/projects/'+expected.project+'/custom-environments') return Response.json({environments:environment??[{id:expected.environment,slug:expected.slug}]});
  if(url.pathname==='/v13/deployments') {
   assert.equal(init.method,'POST');const body=JSON.parse(init.body);
   assert.deepEqual(body,{name:expected.slug,project:expected.project,customEnvironmentSlugOrId:expected.environment,gitSource,meta:{githubCommitSha:expected.sha,recetteSourceSha:expected.sha}});
   return Response.json({...ready,...create});
  }
  if(url.pathname==='/v13/deployments/dpl_synthetic') return Response.json({...ready,...poll});
  throw Error('Upload, user lookup, fallback or unexpected transport');
 };
 return {calls,events,run:()=>deployRecette({token:'synthetic-restricted',http,git,wait:async()=>{},emit:e=>events.push(e)})};
}
test('manual verification remains default, exact source and dedicated secret preserved; upload and local cron rewrite removed',()=>{
 const config=yaml.load(workflow);
 assert.equal(config.on.workflow_dispatch.inputs.verify_only.default,true);
 assert.equal(config.jobs.deploy.environment,expected.slug);
 assert.equal(config.jobs.deploy.steps.find(s=>s.uses==='actions/checkout@v4').with.ref,expected.sha);
 assert.match(workflow,/secrets.VERCEL_RECETTE_TOKEN/);assert(!workflow.includes('secrets.VERCEL_TOKEN'));
 assert(workflow.includes('test "${{ github.run_attempt }}" = "1"'));
 assert(!workflow.includes('/v2/files'));assert(!workflow.includes('config.crons = []'));
 assert(!workflow.includes('gitAccessToken'));assert(!workflow.includes('vercel deploy'));
});
// YAML parsing does not execute workflow steps.
import yaml from 'js-yaml';
test('source includes immutable SHA twice and repository ID, not a moving branch',()=>{
 assert.deepEqual(approvedGitSource(fakeGit),gitSource);
 for(const [operation,value,code] of [['rev-parse','wrong','SOURCE_SHA_REFUSED'],['remote','https://github.com/other/repo','SOURCE_REPOSITORY_REFUSED'],['cat-file','blob','SOURCE_COMMIT_REFUSED']]) {
  assert.throws(()=>approvedGitSource(args=>args[0]===operation?Buffer.from(value):fakeGit(args)),new RegExp(code));
 }
});
test('actual b2a51dd schedules are present and cause refusal before all HTTP, without changing source',async()=>{
 const original=execFileSync('git',['show',expected.sha+':vercel.json']);
 assert.equal(JSON.parse(original).crons.length,2);
 const h=harness({git:args=>args[0]==='show'?original:fakeGit(args)});
 await assert.rejects(h.run(),/GIT_SOURCE_CRONS_PRESENT_NO_DEPLOYMENT/);assert.equal(h.calls.length,0);
 assert.deepEqual(execFileSync('git',['show',expected.sha+':vercel.json']),original);
});
test('missing configuration, malformed or nonempty crons cannot use an undocumented override',()=>{
 for(const data of ['bad JSON','{"crons":null}','{"crons":{}}','{"crons":[{"path":"/run"}]}']) assert.throws(()=>approvedGitSource(args=>args[0]==='show'?Buffer.from(data):fakeGit(args)));
 assert.deepEqual(approvedGitSource(args=>args[0]==='show'?Buffer.from('{}'):fakeGit(args)),gitSource);
});
test('synthetic cron-free Git deployment: no upload, exactly one creation, exact custom target and source',async()=>{
 const h=harness();assert.equal((await h.run()).event,'READY');
 assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
 assert(!JSON.stringify(h.events).includes('synthetic-restricted'));
});
test('foreign or absent GitHub link, wrong project/team/name or conflicting Environment denied before POST',async()=>{
 const base={id:expected.project,name:expected.slug,accountId:expected.team,link};
 for(const project of [{...base,id:'foreign'},{...base,name:'production'},{...base,accountId:'foreign'},{...base,link:null},...['type','repoId','org','repo'].map(k=>({...base,link:{...link,[k]:'foreign'}}))]) {
  const h=harness({project});await assert.rejects(h.run(),/PROJECT_IDENTITY_REFUSED/);assert(h.calls.every(c=>c.method==='GET'));
 }
 for(const environment of [[],[{id:'foreign',slug:expected.slug}],[{id:expected.environment,slug:'production'}],[{id:expected.environment,slug:expected.slug,projectId:'foreign'}],[{id:expected.environment,slug:expected.slug},{id:expected.environment,slug:expected.slug}]]) {
  const h=harness({environment});await assert.rejects(h.run(),/CUSTOM_ENVIRONMENT_REFUSED/);assert(h.calls.every(c=>c.method==='GET'));
 }
});
test('missing secret or incorrect approved SHA makes no HTTP requests',async()=>{
 let calls=0;const http=()=>{calls++;throw Error('MUST_NOT_CALL');};
 await assert.rejects(deployRecette({token:'',http,git:fakeGit}),/DEDICATED_RECETTE_TOKEN_REQUIRED/);
 await assert.rejects(deployRecette({token:'synthetic',http,git:()=>Buffer.from('wrong')}),/SOURCE_SHA_REFUSED/);assert.equal(calls,0);
});
test('401/403 metadata refusal stops immediately without POST or fallback',async()=>{
 for(const failStatus of [401,403]) for(const failPath of ['/v9/projects/'+expected.project,'/projects/'+expected.project+'/custom-environments']) {
  const h=harness({failStatus,failPath});await assert.rejects(h.run(),new RegExp('METADATA_HTTP_'+failStatus));assert(h.calls.every(c=>c.method==='GET'));assert.equal(h.calls.at(-1).path,failPath);
 }
});
test('lost create acknowledgement, 408/5xx or 401/403 never cause second creation',async()=>{
 for(const options of [{timeout:true},...[401,403,408,500].map(failStatus=>({failStatus}))]) {
  const h=harness({failPath:'/v13/deployments',...options});await assert.rejects(h.run(),options.timeout?/CREATE_OUTCOME_UNCERTAIN_NO_RETRY/:/CREATE_HTTP_/);
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);assert.equal(h.events.length,0);
 }
});
test('wrong returned Git source, project, team or custom target is uncertain and never announced READY',async()=>{
 for(const create of [{gitSource:{...gitSource,sha:'foreign'}},{gitSource:{...gitSource,ref:'main'}},{gitSource:{...gitSource,repoId:'foreign'}},{gitSource:{...gitSource,type:'gitlab'}},{gitSource:null},{target:'production'},{projectId:'foreign'},{ownerId:'foreign'},{customEnvironment:{id:'foreign',slug:expected.slug}},{meta:{githubCommitSha:'foreign'}}]) {
  const h=harness({create});await assert.rejects(h.run(),/DEPLOYMENT_BINDING_UNCERTAIN_NO_RETRY/);assert.equal(h.events.length,1);assert.equal(h.events[0].event,'CREATED_NOT_YET_CERTIFIED');assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
 }
});
test('ambiguous deployment ID or URL never yields a certified identity or triggers a retry',async()=>{
 for(const create of [{id:'foreign'}, {url:'production.example.com'}, {url:'clara-os-recette-synthetic-melodie-digital.vercel.app.evil.example'}]) {
  const h=harness({create});await assert.rejects(h.run(),/CREATED_DEPLOYMENT_IDENTITY_UNCERTAIN_NO_RETRY/);assert.equal(h.events.length,0);assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
 }
});
test('build failure and polling interruption never repeat creation; successful polling checks source again',async()=>{
 for(const options of [{poll:{readyState:'ERROR'}},{poll:{gitSource:{...gitSource,sha:'foreign'}}},{failPath:'/v13/deployments/dpl_synthetic',failStatus:403}]) {
  const h=harness({create:{readyState:'BUILDING'},...options});await assert.rejects(h.run());assert.equal(h.calls.filter(c=>c.method==='POST').length,1);assert(!h.events.some(e=>e.event==='READY'));
 }
 const h=harness({create:{readyState:'BUILDING'}});assert.equal((await h.run()).event,'READY');assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
});

const preflightMarker = "node --input-type=module - <<'NODE_PREFLIGHT'\n";
assert.equal(workflow.split(preflightMarker).length,2);
const preflightCode = workflow.split(preflightMarker)[1].split('\n          NODE_PREFLIGHT')[0].split('\n').map(line => line.slice(10)).join('\n');
writeFileSync(join(temporary,'preflight.mjs'),preflightCode);
const {verifyCustomEnvironment} = await import(pathToFileURL(join(temporary,'preflight.mjs')).href);
function preflightHarness({project,environment,status=200,failAt=2,malformed=false,network=false}={}) {
 const calls=[];
 const http=async(url,init)=>{
  calls.push({url,init});
  assert.equal(url.origin,'https://api.vercel.com');assert.equal(url.searchParams.get('teamId'),expected.team);
  assert.equal(init.method,'GET');assert.equal(init.body,undefined);assert.equal(init.redirect,'error');assert.ok(init.signal);
  assert.equal(init.headers.Authorization,'Bearer synthetic-restricted');
  if (calls.length===failAt) {
   if(network) throw Error('synthetic-restricted sensitive provider detail');
   if(status!==200) return new Response('sensitive provider detail',{status});
   if(malformed) return new Response('not JSON');
  }
  if(url.pathname==='/v9/projects/'+expected.project) return Response.json(project??{id:expected.project,name:expected.slug,accountId:expected.team,link});
  assert.equal(url.pathname,'/projects/'+expected.project+'/custom-environments');
  return Response.json({environments:environment??[{id:expected.environment,slug:expected.slug}]});
 };
 return {calls,run:()=>verifyCustomEnvironment({token:'synthetic-restricted',http})};
}
test('verify_only runs custom Environment preflight unconditionally and reports only read-only bindings',async()=>{
 const config=yaml.load(workflow);
 const steps=config.jobs.deploy.steps;
 const step=steps.find(s=>s.name==='Strictly verify custom recette Environment (read-only)');
 assert.ok(step);assert.equal(step.if,undefined);
 assert.equal(step.env.VERCEL_RECETTE_TOKEN,'${{ secrets.VERCEL_RECETTE_TOKEN }}');
 assert(steps.indexOf(step)<steps.findIndex(s=>s.name.startsWith('Deploy only custom')));
 assert.match(step.run,/WRITE_PERMISSIONS_NON_ATTESTED/);
 const h=preflightHarness();const result=await h.run();
 assert.deepEqual(result,{projectId:expected.project,teamId:expected.team,environmentId:expected.environment,slug:expected.slug});
 assert.equal(h.calls.length,2);assert(!JSON.stringify(result).includes('synthetic-restricted'));
});
test('read-only preflight refuses foreign identities, absent or conflicting Environments without any POST',async()=>{
 for(const options of [
  {project:{id:'foreign',name:expected.slug,accountId:expected.team}},
  {project:{id:expected.project,name:expected.slug,accountId:'foreign'}},
  {project:{id:expected.project,name:expected.slug,accountId:expected.team,link:{}}},
  {environment:[]}, {environment:[{id:'foreign',slug:expected.slug}]},
  {environment:[{id:expected.environment,slug:'production'}]},
  {environment:[{id:expected.environment,slug:expected.slug,projectId:'foreign'}]},
  {environment:[{id:expected.environment,slug:expected.slug},{id:'other',slug:expected.slug}]},
 ]) {const h=preflightHarness(options);await assert.rejects(h.run(),/PREFLIGHT_(PROJECT|ENVIRONMENT)_REFUSED/);assert(h.calls.every(c=>c.init.method==='GET'));}
});
test('preflight 401/403 stops immediately without retry or fallback and never reflects sensitive errors',async()=>{
 for(const status of [401,403]) for(const failAt of [1,2]) {
  const h=preflightHarness({status,failAt});await assert.rejects(h.run(),new RegExp('^Error: PREFLIGHT_HTTP_'+status+'$'));
  assert.equal(h.calls.length,failAt);
 }
 for(const options of [{network:true},{malformed:true}]) {
  const h=preflightHarness(options);await assert.rejects(h.run(),/^Error: PREFLIGHT_(TRANSPORT|RESPONSE)_REFUSED$/);
  assert.equal(h.calls.length,2);
 }
 let calls=0;await assert.rejects(verifyCustomEnvironment({token:'',http:()=>{calls++;}}),/DEDICATED_RECETTE_TOKEN_REQUIRED/);assert.equal(calls,0);
});
