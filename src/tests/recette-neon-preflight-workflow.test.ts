import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const {load}=require('js-yaml');
const source=readFileSync('.github/workflows/clara-os-recette-neon-preflight.yml','utf8');
const workflow=load(source);
const approved='b6cdfe3574c5e413e03d6cef09d3ce7d67b89f78';
const tool='e176cf5baa8cbf41f7cc1444b7fc4debdc6f87a8';

test('workflow has only a manual trigger, one protected environment/job and constant immutable sources',()=>{
 assert.deepEqual(workflow.on,{workflow_dispatch:null});
 assert.deepEqual(workflow.permissions,{contents:'read'});
 assert.deepEqual(workflow.concurrency,{group:'clara-os-recette-neon-preflight','cancel-in-progress':false});
 assert.deepEqual(Object.keys(workflow.jobs),['preflight']);
 const job=workflow.jobs.preflight;assert.equal(job.environment,'clara-os-recette-neon-preflight');
 assert.equal(job['timeout-minutes'],10);assert.ok(!job.strategy);assert.ok(!job.permissions);
 assert.ok(job.if.includes("github.event_name == 'workflow_dispatch'"));
 const checkouts=job.steps.filter((s: {uses?:string})=>s.uses?.startsWith('actions/checkout@'));
 assert.deepEqual(checkouts.map((s: {with:{ref:string}})=>s.with.ref),[approved,tool]);
 for(const s of checkouts)assert.equal(s.with['persist-credentials'],false);
 for(const s of job.steps.filter((s:{uses?:string})=>s.uses))assert.match(s.uses,/@[0-9a-f]{40}$/);
 const verification=job.steps.find((s:{name:string})=>s.name==='Verify immutable sources and unchanged dependencies').run;
 for(const check of ['git -C reference rev-parse HEAD','git -C preflight-tool rev-parse HEAD','git -C preflight-tool rev-parse HEAD^','cmp reference/package-lock.json'])assert.ok(verification.includes(check));
});

test('all executable commands are allowlisted; only the final step receives exactly two secrets',()=>{
 const steps=workflow.jobs.preflight.steps;
 assert.ok(!workflow.env);assert.ok(!workflow.jobs.preflight.env);
 const secretSteps=steps.filter((s:unknown)=>JSON.stringify(s).includes('secrets.'));
 assert.equal(secretSteps.length,1);assert.equal(secretSteps[0],steps.at(-1));
 assert.deepEqual([...source.matchAll(/secrets\.([A-Z_]+)/g)].map(m=>m[1]).sort(),['DATABASE_URL','NEON_API_KEY']);
 assert.doesNotMatch(source,/RECETTE_FIXTURE_SESSION_TOKEN|POSTGRES_URL|workflow_call|pull_request|schedule:/);
 const commands=steps.filter((s:{run?:string})=>s.run).map((s:{run:string})=>s.run);
 assert.equal(commands.length,4);
 for(const block of commands){
  assert.doesNotMatch(block,/--apply\b|\b(?:vercel|psql|curl|wget|GRANT|INSERT|UPDATE|DELETE|migrate|migration|seedRecetteFixture)\b/i);
  for(const line of block.trim().split('\n'))assert.match(line,/^(?:set -euo pipefail|test |cmp |npm ci --ignore-scripts --no-audit --no-fund$|node --import tsx src\/scripts\/check-recette-neon-cloud\.mts --check-cloud --confirm=br-crimson-feather-b2zr00sf$)/);
 }
 const last=steps.at(-1);assert.equal(last.env.VERCEL_TARGET_ENV,'clara-os-recette');
 assert.equal(last.env.CLARA_RECETTE_NEON_BRANCH_ID,'br-crimson-feather-b2zr00sf');
 assert.equal(last.env.CLARA_RECETTE_MODE,'isolated-v1');assert.notEqual(last.env.VERCEL_ENV,'production');
 assert.equal(last['working-directory'],'preflight-tool');
});

test('read-only entrypoint dependency graph has no write/provisioning/session modules or execution primitives',()=>{
 const visited=new Set<string>();
 function inspect(file:string){
  file=resolve(file);if(visited.has(file))return;visited.add(file);
  const text=readFileSync(file,'utf8');
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  const banned=new Set(['seedRecetteFixture','createOpaqueSessionToken','issueAuthenticatedSession','writeFile','execFile','spawn']);
  function inspectCalls(node:ts.Node){
   if(ts.isCallExpression(node))assert.ok(!banned.has(node.expression.getText(ast)));
   ts.forEachChild(node,inspectCalls);
  }
  inspectCalls(ast);
  for(const statement of ast.statements){
   if(!ts.isImportDeclaration(statement))continue;
   const name=(statement.moduleSpecifier as ts.StringLiteral).text;
   if(name.startsWith('.')){
    assert.ok(!name.includes('fixture-provisioning'));inspect(resolve(dirname(file),name+'.ts'));
   }else assert.equal(name,'@neondatabase/serverless');
  }
 }
 inspect('src/scripts/check-recette-neon-cloud.mts');
 assert.equal(visited.size,5); // CLI -> cloud -> fixture/policy/diagnostics, no auth/store imports
 const fixture=readFileSync('src/lib/recette/fixture-preflight.ts','utf8');
 const ast=ts.createSourceFile('fixture.ts',fixture,ts.ScriptTarget.Latest,true);
 let queries=0;
 function visit(node:ts.Node){
  if(ts.isTaggedTemplateExpression(node)&&node.tag.getText(ast)==='query'){
   queries++;const text=node.template.getText(ast).slice(1,-1).trim();assert.match(text,/^SELECT\b/);
   assert.ok(!text.includes('${')); // static catalog SELECTs, no interpolated SQL
   const executable=text.replace(/'(?:''|[^'])*'/g,"''");
   assert.doesNotMatch(executable,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|DO|set_config|pg_advisory_xact_lock)\b/i);
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);assert.equal(queries,3);
});
