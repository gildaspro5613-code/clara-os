import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const workflow = readFileSync(new URL('../workflows/clara-os-independent-recette.yml',import.meta.url),'utf8');
const marker="node --input-type=module - <<'NODE_API'\n";
assert.equal(workflow.split(marker).length,2);
const code=workflow.split(marker)[1].split('\n          NODE_API')[0].split('\n').map(line=>line.slice(10)).join('\n');
const temporary=mkdtempSync(join(tmpdir(),'recette-git-api-offline-'));
writeFileSync(join(temporary,'driver.mjs'),code);
const {deployRecette,verifyApprovedSource,approvedFiles,expected}=await import(pathToFileURL(join(temporary,'driver.mjs')).href);
test.after(()=>rmSync(temporary,{recursive:true,force:true}));
const link={type:'github',repoId:1316164838,org:'gildaspro5613-code',repo:'clara-os'};
const contents=new Map([['package.json',Buffer.from('{}')],['package-lock.json',Buffer.from('{}')],['vercel.json',Buffer.from('{}')],['public/binary.bin',Buffer.from([0,255,1,0])]]);
// Transport is simulated; source provenance and Production preservation are tested against Git below.
function fakeGit(args) {
 if(args[0]==='rev-parse') return Buffer.from((args[1]==='HEAD'?expected.sha:expected.baseSha)+'\n');
 if(args[0]==='remote') return Buffer.from('https://github.com/gildaspro5613-code/clara-os\n');
 if(args[0]==='cat-file') return Buffer.from('commit\n');
 if(args[0]==='show') return args[1]===expected.baseSha+':vercel.json'?Buffer.from('{"crons":[{},{}]}'):contents.get(args[1].slice(expected.sha.length+1));
 if(args[0]==='ls-tree') return Buffer.from([...contents.keys()].map(file=>'100644 blob '+'a'.repeat(40)+'\t'+file+'\0').join(''));
 if(args[0]==='diff') return Buffer.from('vercel.json\n');
 throw Error('UNEXPECTED_GIT_OPERATION');
}
function harness({project,environment,create,poll,failPath,failStatus=403,timeout=false,git=fakeGit,failUploadAt=1,uploadStatus=200,createMalformed=false}={}) {
 const calls=[],events=[];
 const ready={id:'dpl_synthetic',url:'clara-os-recette-synthetic-melodie-digital.vercel.app',ownerId:expected.team,projectId:expected.project,
  customEnvironment:{id:expected.environment,slug:expected.slug},meta:{githubCommitSha:expected.sha},readyState:'READY'};
 const http=async(url,init)=>{
  assert.equal(url.origin,'https://api.vercel.com');assert.equal(url.searchParams.get('teamId'),expected.team);
  assert.equal(init.headers.Authorization,'Bearer synthetic-restricted');assert.equal(init.redirect,'error');assert.ok(init.signal);
  calls.push({path:url.pathname,method:init.method,body:init.body});
  if(url.pathname===failPath && (failPath!=='/v2/files'||calls.filter(c=>c.path==='/v2/files').length===failUploadAt)) {if(timeout) throw Error('synthetic-restricted sensitive provider detail');return new Response('sensitive provider detail',{status:failStatus});}
  if(url.pathname==='/v9/projects/'+expected.project) return Response.json(project??{id:expected.project,name:expected.slug,accountId:expected.team});
  if(url.pathname==='/projects/'+expected.project+'/custom-environments') return Response.json({environments:environment??[{id:expected.environment,slug:expected.slug}]});
  if(url.pathname==='/v2/files') {
   assert.equal(init.method,'POST');assert.ok(Buffer.isBuffer(init.body));
   assert.equal(init.headers['Content-Length'],String(init.body.length));assert.equal(init.headers['x-now-size'],String(init.body.length));
   assert.equal(init.headers['x-vercel-digest'],createHash('sha1').update(init.body).digest('hex'));
   return new Response(null,{status:uploadStatus});
  }
  if(url.pathname==='/v13/deployments') {
   assert.equal(init.method,'POST');const body=JSON.parse(init.body);
   for(const file of body.files){const upload=calls.find(c=>c.path==='/v2/files'&&createHash('sha1').update(c.body).digest('hex')===file.sha);assert.ok(upload);assert.equal(upload.body.length,file.size);}
   assert.deepEqual(body,{name:expected.slug,project:expected.project,customEnvironmentSlugOrId:expected.environment,files:approvedFiles(git).map(({file,sha,size})=>({file,sha,size})),meta:{githubCommitSha:expected.sha,recetteSourceSha:expected.sha}});
   if(createMalformed)return new Response('sensitive provider detail',{status:200});
   return Response.json({...ready,...create});
  }
  if(url.pathname==='/v13/deployments/dpl_synthetic') return Response.json({...ready,...poll});
  throw Error('Upload, user lookup, fallback or unexpected transport');
 };
 return {calls,events,run:()=>deployRecette({token:'synthetic-restricted',http,git,wait:async()=>{},emit:e=>events.push(e),writesAuthorized:true})};
}
test('workflow has three write locks and default read-only verification; exact source and secret preserved',()=>{
 const config=yaml.load(workflow);
 assert.equal(config.on.workflow_dispatch.inputs.verify_only.default,true);
 assert.equal(config.jobs.deploy.environment,expected.slug);
 assert.equal(config.jobs.deploy.steps.find(s=>s.uses==='actions/checkout@v4').with.ref,'4cb5f2e226eb118ba772a68671590fd7c8d1cd82');
 // Historical write transport is separately pinned and deliberately unreachable.
 assert.equal(expected.sha,'6cfed8f80f9b8451d5698ca1040bcf42d513c4f2');
 assert.match(workflow,/secrets.VERCEL_RECETTE_TOKEN/);assert(!workflow.includes('secrets.VERCEL_TOKEN'));
 assert(workflow.includes('test "${{ github.run_attempt }}" = "1"'));
 const deployStep=config.jobs.deploy.steps.find(s=>s.name.startsWith('Deploy only custom'));
 assert.equal(deployStep.if,'${{ false }}');assert.match(deployStep.run,/writesAuthorized:false/);
 const gate=config.jobs.deploy.steps.find(s=>s.name==='Refuse write requests during transport preparation');
 assert.equal(gate.if,'${{ inputs.verify_only != true }}');assert.match(gate.run,/exit 1/);
 assert(workflow.includes('/v2/files'));assert(!workflow.includes('config.crons = []'));
 assert(!workflow.includes('gitSource'));assert(!workflow.includes('gitAccessToken'));assert(!workflow.includes('vercel deploy'));
});
// YAML parsing does not execute workflow steps.
import yaml from 'js-yaml';
test('source SHA, parent, repository and configuration verified without a Git provider link',()=>{
 assert.equal(verifyApprovedSource(fakeGit),undefined);
 for(const [operation,value,code] of [['rev-parse','wrong','SOURCE_SHA_REFUSED'],['remote','https://github.com/other/repo','SOURCE_REPOSITORY_REFUSED'],['cat-file','blob','SOURCE_COMMIT_REFUSED']]) {
  assert.throws(()=>verifyApprovedSource(args=>args[0]===operation?Buffer.from(value):fakeGit(args)),new RegExp(code));
 }
});
test('actual b2a51dd schedules are present and cause refusal before all HTTP, without changing source',async()=>{
 const original=execFileSync('git',['show',expected.baseSha+':vercel.json']);
 assert.equal(JSON.parse(original).crons.length,2);
 const h=harness({git:args=>args[0]==='show'?original:fakeGit(args)});
 await assert.rejects(h.run(),/SOURCE_CRONS_PRESENT_NO_DEPLOYMENT/);assert.equal(h.calls.length,0);
 assert.deepEqual(execFileSync('git',['show',expected.baseSha+':vercel.json']),original);
});
test('missing configuration, malformed or nonempty crons cannot use an undocumented override',()=>{
 for(const data of ['bad JSON','{"crons":null}','{"crons":{}}','{"crons":[{"path":"/run"}]}']) assert.throws(()=>verifyApprovedSource(args=>args[0]==='show'&&args[1]===expected.sha+':vercel.json'?Buffer.from(data):fakeGit(args)));
 assert.equal(verifyApprovedSource(args=>args[0]==='show'&&args[1]===expected.sha+':vercel.json'?Buffer.from('{}'):fakeGit(args)),undefined);
});
test('synthetic upload transport deduplicates exact bytes then creates once on exact target',async()=>{
 const h=harness();assert.equal((await h.run()).event,'READY');
 assert.equal(h.calls.filter(c=>c.method==='POST'&&c.path==='/v13/deployments').length,1);
 assert(!JSON.stringify(h.events).includes('synthetic-restricted'));
});
test('linked project, wrong project/team/name or conflicting Environment denied before POST',async()=>{
 const base={id:expected.project,name:expected.slug,accountId:expected.team};
 for(const project of [{...base,id:'foreign'},{...base,name:'production'},{...base,accountId:'foreign'},{...base,link}, {...base,gitRepository:{type:'github'}}]) {
  const h=harness({project});await assert.rejects(h.run(),/PROJECT_IDENTITY_REFUSED/);assert(h.calls.every(c=>c.method==='GET'));
 }
 for(const environment of [[],[{id:'foreign',slug:expected.slug}],[{id:expected.environment,slug:'production'}],[{id:expected.environment,slug:expected.slug,projectId:'foreign'}],[{id:expected.environment,slug:expected.slug},{id:expected.environment,slug:expected.slug}]]) {
  const h=harness({environment});await assert.rejects(h.run(),/CUSTOM_ENVIRONMENT_REFUSED/);assert(h.calls.every(c=>c.method==='GET'));
 }
});
test('missing secret or incorrect approved SHA makes no HTTP requests',async()=>{
 let calls=0;const http=()=>{calls++;throw Error('MUST_NOT_CALL');};
 await assert.rejects(deployRecette({token:'',http,git:fakeGit,writesAuthorized:true}),/DEDICATED_RECETTE_TOKEN_REQUIRED/);
 await assert.rejects(deployRecette({token:'synthetic',http,git:()=>Buffer.from('wrong'),writesAuthorized:true}),/SOURCE_SHA_REFUSED/);assert.equal(calls,0);
});
test('401/403 metadata refusal stops immediately without POST or fallback',async()=>{
 for(const failStatus of [401,403]) for(const failPath of ['/v9/projects/'+expected.project,'/projects/'+expected.project+'/custom-environments']) {
  const h=harness({failStatus,failPath});await assert.rejects(h.run(),new RegExp('METADATA_HTTP_'+failStatus));assert(h.calls.every(c=>c.method==='GET'));assert.equal(h.calls.at(-1).path,failPath);
 }
});
test('lost create acknowledgement, 408/5xx or 401/403 never cause second creation',async()=>{
 for(const options of [{timeout:true},...[401,403,408,500].map(failStatus=>({failStatus}))]) {
  const h=harness({failPath:'/v13/deployments',...options});await assert.rejects(h.run(),options.timeout?/CREATE_OUTCOME_UNCERTAIN_NO_RETRY/:/CREATE_HTTP_/);
  assert.equal(h.calls.filter(c=>c.method==='POST'&&c.path==='/v13/deployments').length,1);assert.equal(h.events.length,0);
 }
});
test('wrong returned source metadata, project, team or custom target is uncertain and never announced READY',async()=>{
 for(const create of [{target:'production'},{projectId:'foreign'},{ownerId:'foreign'},{customEnvironment:{id:'foreign',slug:expected.slug}},{meta:{githubCommitSha:'foreign'}}]) {
  const h=harness({create});await assert.rejects(h.run(),/DEPLOYMENT_BINDING_UNCERTAIN_NO_RETRY/);assert.equal(h.events.length,1);assert.equal(h.events[0].event,'CREATED_NOT_YET_CERTIFIED');assert.equal(h.calls.filter(c=>c.method==='POST'&&c.path==='/v13/deployments').length,1);
 }
});
test('ambiguous deployment ID or URL never yields a certified identity or triggers a retry',async()=>{
 for(const create of [{id:'foreign'}, {url:'production.example.com'}, {url:'clara-os-recette-synthetic-melodie-digital.vercel.app.evil.example'}]) {
  const h=harness({create});await assert.rejects(h.run(),/CREATED_DEPLOYMENT_IDENTITY_UNCERTAIN_NO_RETRY/);assert.equal(h.events.length,0);assert.equal(h.calls.filter(c=>c.method==='POST'&&c.path==='/v13/deployments').length,1);
 }
});
test('build failure and polling interruption never repeat creation; successful polling checks source again',async()=>{
 for(const options of [{poll:{readyState:'ERROR'}},{poll:{meta:{githubCommitSha:'foreign'}}},{failPath:'/v13/deployments/dpl_synthetic',failStatus:403}]) {
  const h=harness({create:{readyState:'BUILDING'},...options});await assert.rejects(h.run());assert.equal(h.calls.filter(c=>c.method==='POST'&&c.path==='/v13/deployments').length,1);assert(!h.events.some(e=>e.event==='READY'));
 }
 const h=harness({create:{readyState:'BUILDING'}});assert.equal((await h.run()).event,'READY');assert.equal(h.calls.filter(c=>c.method==='POST'&&c.path==='/v13/deployments').length,1);
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
  if(url.pathname==='/v9/projects/'+expected.project) return Response.json(project??{id:expected.project,name:expected.slug,accountId:expected.team});
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


test('real source manifest includes every approved byte; Production schedules remain unchanged',t=>{
 const git=args=>execFileSync('git',args,{maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
 assert.equal(String(git(['rev-parse',expected.sha+'^'])).trim(),expected.baseSha);
 assert.equal(String(git(['diff','--name-only',expected.baseSha,expected.sha])).trim(),'vercel.json');
 const base=JSON.parse(git(['show',expected.baseSha+':vercel.json']));
 const recette=JSON.parse(git(['show',expected.sha+':vercel.json']));
 assert.equal(base.crons.length,2);assert.equal(recette.crons,undefined);
 delete base.crons;assert.deepEqual(recette,base);
 const localHead=String(git(['rev-parse','HEAD'])).trim();
 assert.notEqual(localHead,expected.sha);
 // The delivery candidate added Git publication exclusions after the historical
 // transport artifact. Preserve its complete config, plus the original crons.
 assert.deepEqual(git(['show',localHead+':vercel.json']),git(['show','4cb5f2e226eb118ba772a68671590fd7c8d1cd82:vercel.json']));
 assert.deepEqual(JSON.parse(git(['show',localHead+':vercel.json'])).crons,
   JSON.parse(git(['show',expected.baseSha+':vercel.json'])).crons);
 assert.throws(()=>git(['merge-base','--is-ancestor',expected.sha,localHead]));
 const actualGit=args=>args[0]==='remote'?fakeGit(args):args[0]==='rev-parse'&&args[1]==='HEAD'?Buffer.from(expected.sha):git(args);
 assert.equal(verifyApprovedSource(actualGit),undefined);
 const files=approvedFiles(actualGit);assert.equal(files.length,1084);
 assert.equal(files.reduce((n,f)=>n+f.size,0),13199227);
 const unique=new Map(files.map(f=>[f.sha,f]));assert.equal(unique.size,1054);
 assert(files.every(f=>f.data.equals(git(['show',expected.sha+':'+f.file]))));
 const body={name:expected.slug,project:expected.project,customEnvironmentSlugOrId:expected.environment,files:files.map(({file,sha,size})=>({file,sha,size})),meta:{githubCommitSha:expected.sha,recetteSourceSha:expected.sha}};
 t.diagnostic(JSON.stringify({uniqueUploads:unique.size,uniqueBytes:[...unique.values()].reduce((n,f)=>n+f.size,0),creationJsonBytes:Buffer.byteLength(JSON.stringify(body))}));
});
test('wrong parent, unrelated business diff or additional configuration changes are refused',()=>{
 assert.throws(()=>verifyApprovedSource(args=>args[0]==='rev-parse'&&args[1]!=='HEAD'?Buffer.from('foreign'):fakeGit(args)),/SOURCE_PARENT_REFUSED/);
 assert.throws(()=>verifyApprovedSource(args=>args[0]==='diff'?Buffer.from('vercel.json\nsrc/business.ts'):fakeGit(args)),/SOURCE_BUSINESS_DIFF_REFUSED/);
 assert.throws(()=>verifyApprovedSource(args=>args[0]==='show'&&args[1]===expected.sha+':vercel.json'?Buffer.from('{"buildCommand":"changed"}'):fakeGit(args)),/SOURCE_CONFIGURATION_DIFF_REFUSED/);
});
test('actual project check accepts only unlinked project and rejects existing Git links',()=>{
 const step=yaml.load(workflow).jobs.deploy.steps.find(s=>s.name==='Resolve and strictly verify independent project');
 assert(!step.run.includes('/v2/user'));assert(!step.run.includes('/v2/teams'));assert(!step.run.includes('const probe'));
 const script=step.run.split("<<'NODE'\n")[1].split('\nNODE')[0];
 for(const data of [{link},{gitRepository:{type:'github'}}]) {
  const input=join(temporary,'project.json');writeFileSync(input,JSON.stringify({id:expected.project,name:expected.slug,accountId:expected.team,...data}));
  try {execFileSync(process.execPath,['-',input,'200'],{input:script,encoding:'utf8',cwd:temporary});assert.fail('MUST_REFUSE');}
  catch(error){assert.equal(error.status,1);assert.match(String(error.stdout),/RECETTE_LINKED_PROJECT_REFUSED/);}
 }
 const input=join(temporary,'project.json');writeFileSync(input,JSON.stringify({id:expected.project,name:expected.slug,accountId:expected.team}));
 assert.match(execFileSync(process.execPath,['-',input,'200'],{input:script,encoding:'utf8',cwd:temporary}),/RECETTE_UNLINKED_PROJECT_VERIFIED/);
});


test('driver write authorization is false by default: no Git access or HTTP even with a token',async()=>{
 let calls=0;const forbidden=()=>{calls++;throw Error('MUST_NOT_CALL');};
 for(const writesAuthorized of [undefined,false,'true']) {
  await assert.rejects(deployRecette({token:'synthetic',http:forbidden,git:forbidden,writesAuthorized}),/REST_WRITES_DISABLED/);
 }
 assert.equal(calls,0);
});
test('upload 401/403 stops immediately; partial uploads never permit deployment creation',async()=>{
 for(const failStatus of [401,403])for(const failUploadAt of [1,2]) {
  const h=harness({failPath:'/v2/files',failStatus,failUploadAt});await assert.rejects(h.run(),new RegExp('UPLOAD_HTTP_'+failStatus));
  assert.equal(h.calls.filter(c=>c.path==='/v2/files').length,failUploadAt);
  assert(!h.calls.some(c=>c.path==='/v13/deployments'));assert.equal(h.events.length,0);
 }
});
test('upload timeout, 408/5xx or unexpected success response is uncertain without retry or create',async()=>{
 for(const options of [{timeout:true},{failStatus:408},{failStatus:500},{uploadStatus:201}]) {
  const h=harness({failPath:options.uploadStatus?undefined:'/v2/files',...options});
  await assert.rejects(h.run(),/UPLOAD_.*OUTCOME_UNCERTAIN_NO_RETRY/);
  assert.equal(h.calls.filter(c=>c.path==='/v2/files').length,1);assert(!h.calls.some(c=>c.path==='/v13/deployments'));
 }
});
test('upload uses exact binary bytes, deduplicates content but preserves every manifest path',async()=>{
 const files=approvedFiles(fakeGit);assert.equal(files.length,4);
 assert.deepEqual([...files.find(f=>f.file==='public/binary.bin').data],[0,255,1,0]);
 const h=harness();await h.run();assert.equal(h.calls.filter(c=>c.path==='/v2/files').length,2);
 const create=h.calls.find(c=>c.path==='/v13/deployments'&&c.method==='POST');assert.equal(JSON.parse(create.body).files.length,4);
 assert.equal(h.calls.at(-1),create);
});
test('unsafe or unsupported source paths are refused before all HTTP',async()=>{
 for(const file of ['.env.local','.vercel/project.json','../outside','.npmrc']) {
  const h=harness({git:args=>args[0]==='ls-tree'?Buffer.from('100644 blob '+'a'.repeat(40)+'\t'+file+'\0'):fakeGit(args)});
  await assert.rejects(h.run(),/SOURCE_FILE_PATH_REFUSED/);assert.equal(h.calls.length,0);
 }
 const h=harness({git:args=>args[0]==='ls-tree'?Buffer.from('120000 blob '+'a'.repeat(40)+'\tsymlink\0'):fakeGit(args)});
 await assert.rejects(h.run(),/SOURCE_FILE_TYPE_REFUSED/);assert.equal(h.calls.length,0);
});
test('creation with unreadable acknowledgement remains uncertain; no second creation or false receipt',async()=>{
 const h=harness({createMalformed:true});await assert.rejects(h.run(),/CREATE_OUTCOME_UNCERTAIN_NO_RETRY/);
 assert.equal(h.calls.filter(c=>c.path==='/v13/deployments'&&c.method==='POST').length,1);assert.equal(h.events.length,0);
});
