import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const workflow = readFileSync(new URL('../workflows/clara-os-independent-recette.yml',import.meta.url),'utf8');
const marker = "node --input-type=module - <<'NODE_API'\n";
assert.equal(workflow.split(marker).length,2);
const code = workflow.split(marker)[1].split('\n          NODE_API')[0].split('\n').map(line => line.slice(10)).join('\n');
const temporary = mkdtempSync(join(tmpdir(),'recette-api-offline-'));
writeFileSync(join(temporary,'driver.mjs'),code);
const {deployRecette,approvedFiles,expected} = await import(pathToFileURL(join(temporary,'driver.mjs')).href);
test.after(() => rmSync(temporary,{recursive:true,force:true}));
const contents = new Map([
 ['package.json',Buffer.from('{"name":"synthetic"}')],['package-lock.json',Buffer.from('{}')],['same-content.txt',Buffer.from('{}')],
 ['vercel.json',Buffer.from(JSON.stringify({crons:[{path:'/one'},{path:'/two'}]}))],
 ['public/synthetic.bin',Buffer.from([0,255,1,0])],
]);
function fakeGit(args) {
 if (args[0] === 'rev-parse') return Buffer.from(expected.sha + '\n');
 if (args[0] === 'ls-tree') return Buffer.from([...contents.keys()].map(file => '100644 blob ' + 'a'.repeat(40) + '\t' + file + '\0').join(''));
 if (args[0] === 'show') return contents.get(args[1].slice(expected.sha.length + 1));
 throw Error('UNEXPECTED_GIT_OPERATION');
}
function harness({project,environment,create,poll,uploadFailure = false,createTimeout = false,createStatus = 200} = {}) {
 const calls = [],events = [];
 const ready = {id:'dpl_synthetic',url:'clara-os-recette-synthetic-melodie-digital.vercel.app',ownerId:expected.team,projectId:expected.project,
  target:null,customEnvironment:{id:expected.environment,slug:expected.slug},meta:{githubCommitSha:expected.sha},readyState:'READY'};
 const http = async (url,init) => {
  assert.equal(url.origin,'https://api.vercel.com');assert.equal(url.searchParams.get('teamId'),expected.team);
  assert.equal(init.redirect,'error');assert.ok(init.signal);assert.equal(init.headers.Authorization,'Bearer synthetic-restricted');
  calls.push({path:url.pathname,method:init.method,body:init.body,headers:init.headers});
  if (url.pathname === '/v9/projects/' + expected.project) return Response.json(project ?? {id:expected.project,name:expected.slug,accountId:expected.team});
  if (url.pathname === '/projects/' + expected.project + '/custom-environments') return Response.json({environments:environment ?? [{id:expected.environment,slug:expected.slug}]});
  if (url.pathname === '/v2/files') {
   assert.equal(init.method,'POST');assert.ok(Buffer.isBuffer(init.body));assert.equal(init.headers['Content-Length'],String(init.body.length));assert.equal(init.headers['x-vercel-digest'],createHash('sha1').update(init.body).digest('hex'));
   return new Response(uploadFailure ? 'sensitive-provider-detail' : null,{status:uploadFailure ? 403 : 200});
  }
  if (url.pathname === '/v13/deployments') {
   if (createTimeout) throw Error('synthetic-restricted must never escape');
   const body = JSON.parse(init.body);
   assert.equal(body.project,expected.project);assert.equal(body.customEnvironmentSlugOrId,expected.environment);
   for (const file of body.files) {const uploaded=calls.find(c=>c.path==='/v2/files'&&c.headers['x-vercel-digest']===file.sha);assert.ok(uploaded);assert.equal(file.size,uploaded.body.length);}
   assert.equal(body.meta.githubCommitSha,expected.sha);assert.equal(body.target,undefined);
   assert.equal(body.env,undefined);assert.equal(body.build,undefined);assert.equal(body.projectSettings,undefined);assert.equal(body.gitSource,undefined);
   return Response.json({...ready,...create},{status:createStatus});
  }
  if (url.pathname === '/v13/deployments/dpl_synthetic') return Response.json({...ready,...poll});
  throw Error('User lookup, global team lookup or unexpected transport');
 };
 return {calls,events,run:() => deployRecette({token:'synthetic-restricted',http,git:fakeGit,wait:async()=>{},emit:event => events.push(event)})};
}

test('workflow remains manual and defaults to verification; REST uses only the dedicated secret',() => {
 assert.match(workflow,/workflow_dispatch:\n    inputs:\n      verify_only:/);
 assert.match(workflow,/default: true/);assert.match(workflow,/environment: clara-os-recette/);
 assert.match(workflow,/Deploy only custom recette environment through official REST API\n        if: \$\{\{ inputs.verify_only == false \}\}/);
 assert.match(workflow,/VERCEL_RECETTE_TOKEN: \$\{\{ secrets.VERCEL_RECETTE_TOKEN \}\}/);
 assert(workflow.includes('test "${{ github.run_attempt }}" = "1"'));
 assert(!workflow.includes('secrets.VERCEL_TOKEN'));assert(!workflow.includes('vercel deploy'));assert(!workflow.includes('npm install --global vercel'));
});
test('approved Git bytes only; binary preserved and both crons removed without copying local env',() => {
 const files = approvedFiles(fakeGit);
 assert.deepEqual([...files.find(f => f.file === 'public/synthetic.bin').data],[0,255,1,0]);
 assert.deepEqual(JSON.parse(files.find(f => f.file === 'vercel.json').data).crons,[]);
 assert.equal(JSON.parse(contents.get('vercel.json')).crons.length,2);
 assert.throws(() => approvedFiles(args => args[0] === 'rev-parse' ? Buffer.from('wrong') : fakeGit(args)),/SOURCE_SHA_REFUSED/);
 for (const file of ['.env.local','.vercel/project.json','../outside','.npmrc']) {
  assert.throws(() => approvedFiles(args => args[0] === 'ls-tree' ? Buffer.from('100644 blob ' + 'a'.repeat(40) + '\t' + file + '\0') : fakeGit(args)),/SOURCE_FILE_PATH_REFUSED/);
 }
 assert.throws(() => approvedFiles(args => args[0] === 'ls-tree' ? Buffer.from('120000 blob ' + 'a'.repeat(40) + '\tsymlink\0') : fakeGit(args)),/SOURCE_FILE_TYPE_REFUSED/);
});
test('successful restricted-token simulation never asks for a personal user, uploads binaries, creates exactly once in custom environment',async () => {
 const h = harness();const result = await h.run();assert.equal(result.event,'READY');
 assert.equal(h.calls.filter(c => c.path === '/v13/deployments' && c.method === 'POST').length,1);
 assert(!h.calls.some(c => c.path.includes('/user') || c.path.includes('/teams')));
 assert.equal(h.calls.filter(c=>c.path==='/v2/files').length,4,'identical content uploaded once');
 assert(!JSON.stringify(h.events).includes('synthetic-restricted'));
});
test('strict foreign project/team/environment and linked project denied before all writes',async () => {
 for (const options of [
  {project:{id:'foreign',name:expected.slug,accountId:expected.team}},
  {project:{id:expected.project,name:expected.slug,accountId:'foreign'}},
  {project:{id:expected.project,name:expected.slug,accountId:expected.team,link:{}}},
  {environment:[{id:'foreign',slug:expected.slug}]},
  {environment:[{id:expected.environment,slug:'production'}]},
  {environment:[]},
 ]) { const h = harness(options);await assert.rejects(h.run());assert(h.calls.every(c => c.method === 'GET')); }
});
test('missing credential and mismatched source never reach transport',async () => {
 let calls = 0;const http = async()=>{calls++;throw Error('MUST NOT CALL');};
 await assert.rejects(deployRecette({token:'',http,git:fakeGit}),/DEDICATED_RECETTE_TOKEN_REQUIRED/);
 await assert.rejects(deployRecette({token:'synthetic',http,git:()=>Buffer.from('wrong')}),/SOURCE_SHA_REFUSED/);
 assert.equal(calls,0);
});
test('upload denial stops before deployment creation; no broader credential or retry',async () => {
 const h = harness({uploadFailure:true});await assert.rejects(h.run(),/UPLOAD_HTTP_403/);
 assert(!h.calls.some(c => c.path === '/v13/deployments'));assert.equal(h.events.length,0);
});
test('lost creation acknowledgement is uncertain: a single POST, no polling or automatic second deployment',async () => {
 const h = harness({createTimeout:true});await assert.rejects(h.run(),/CREATE_OUTCOME_UNCERTAIN_NO_RETRY/);
 assert.equal(h.calls.filter(c => c.path === '/v13/deployments').length,1);assert.equal(h.events.length,0);
});
test('wrong created target or source never announced READY; identity retained as unverified for operator',async () => {
 for (const create of [{target:'production'},{customEnvironment:null},{projectId:'foreign'},{meta:{}},{ownerId:'foreign'}]) {
  const h = harness({create});await assert.rejects(h.run(),/DEPLOYMENT_BINDING_UNCERTAIN_NO_RETRY/);
  assert.equal(h.events[0].event,'CREATED_NOT_YET_CERTIFIED');assert(!h.events.some(e => e.event === 'READY'));
  assert.equal(h.calls.filter(c => c.path === '/v13/deployments').length,1);
 }
});
test('build failure and interrupted polling never create again; READY only after scoped response',async () => {
 const failed = harness({create:{readyState:'ERROR'}});await assert.rejects(failed.run(),/DEPLOYMENT_ERROR_NO_RETRY/);
 assert.equal(failed.calls.filter(c => c.path === '/v13/deployments').length,1);
 const progressing = harness({create:{readyState:'BUILDING'}});assert.equal((await progressing.run()).event,'READY');
 assert.equal(progressing.calls.filter(c => c.method === 'POST' && c.path === '/v13/deployments').length,1);
 const changed = harness({create:{readyState:'BUILDING'},poll:{customEnvironment:null}});await assert.rejects(changed.run(),/DEPLOYMENT_BINDING_UNCERTAIN_NO_RETRY/);
 assert(!changed.events.some(e => e.event === 'READY'));
});
test('actual approved repository snapshot is reproducible and excludes an untracked local env file',() => {
 const dir = join(temporary,'source');
 const git = args => execFileSync('git',['-C',dir,...args],{maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
 execFileSync('git',['clone','--shared','--no-checkout',process.cwd(),dir],{stdio:'pipe'});
 git(['checkout','--detach',expected.sha]);writeFileSync(join(dir,'.env.local'),'SYNTHETIC_UNTRACKED_DO_NOT_UPLOAD');
 const files = approvedFiles(git);assert(files.length>1000);assert(!files.some(f=>f.file === '.env.local'));
 assert(!files.some(f=>f.data.includes('SYNTHETIC_UNTRACKED_DO_NOT_UPLOAD')));
 assert.deepEqual(JSON.parse(files.find(f=>f.file==='vercel.json').data).crons,[]);
 const original = git(['show',expected.sha+':src/lib/recette/external-execution-guard.ts']);
 assert.deepEqual(files.find(f=>f.file==='src/lib/recette/external-execution-guard.ts').data,original);
});

test('server-side creation error remains uncertain and is never retried; missing capability is explicit',async () => {
 for (const status of [500,408,403]) {
  const h = harness({createStatus:status});
  await assert.rejects(h.run(),status === 403 ? /CREATE_HTTP_403/ : /OUTCOME_UNCERTAIN_NO_RETRY/);
  assert.equal(h.calls.filter(c=>c.path === '/v13/deployments').length,1);assert.equal(h.events.length,0);
 }
});
