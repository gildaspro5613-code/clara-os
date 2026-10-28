import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {NextResponse} from 'next/server';

// Route presentation only; real authorization is covered by Microsoft authority tests.
test('missing Microsoft setup returns safe browser guidance, retains JSON refusal and never provisions a connection',async()=>{
 let authorized=true,repositoryCalls=0;
 const exports:Record<string,unknown>={};
 const modules:Record<string,unknown>={
  'next/server':{NextResponse},
  '@/lib/connectors/microsoft/security/authenticated-microsoft-workspace':{authenticatedMicrosoftWorkspace:async()=>authorized?{workspaceId:'synthetic'}:null},
  '@/lib/connections/connection':{ConnectionStatus:{}},
  '@/lib/connections/connection-repository':{DatabaseConnectionRepository:class{constructor(){repositoryCalls++;}}},
  '@/lib/auth/oauth/service':{},'@/lib/auth/oauth/providers':{},'@/lib/auth/oauth/state':{},
  '@/lib/config/microsoft':{microsoftConfig:{clientId:'',clientSecret:'',redirectUri:''}},
  '@/lib/connectors/microsoft/oauth/microsoft-oauth':{},
 };
 const code=ts.transpileModule(readFileSync('src/app/api/connections/microsoft/connect/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:(name:string)=>{assert.ok(name in modules,name);return modules[name];},URL});
 const get=exports.GET as (request:Request)=>Promise<Response>;
 const request=(accept:string)=>new Request('https://isolated.invalid/api/connections/microsoft/connect',{headers:{accept}});
 const json=await get(request('application/json'));assert.equal(json.status,503);assert.deepEqual(await json.json(),{error:'MICROSOFT_OAUTH_NOT_CONFIGURED'});
 const html=await get(request('text/html'));assert.equal(html.status,307);assert.equal(html.headers.get('location'),'https://isolated.invalid/connexions?microsoft=not_configured');
 authorized=false;assert.equal((await get(request('text/html'))).status,403);assert.equal(repositoryCalls,0);
});
