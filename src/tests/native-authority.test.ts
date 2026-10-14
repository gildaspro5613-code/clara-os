import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import vm from "node:vm";
import ts from "typescript";
import {createNativeAuthority,nativeOperationFence,nativeFailure} from "../lib/native/authority";
import {nativeRequest,nativeContext,nativeCommand,withNativeScope} from "../lib/native/scoped-context";
import {fields,registryBody,sameOrigin} from "../lib/canonical/http";
import {RegistryError,registryContext,opaque} from "../lib/canonical/registry";

function compiled(file:string,modules:Record<string,unknown>){
 const exports:Record<string,unknown>={},require=createRequire(resolve(file));
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(name:string)=>modules[name]??require(name),Response,Request,URL,console,process});return exports;
}
test('native session handler rejects missing, malformed and duplicate cookies before storage or global runtime',async()=>{
 let reads=0;const read=createNativeAuthority(async()=>{reads++;throw new Error('Storage must not be reached');});
 const get=compiled('src/app/api/clara/session/route.ts',{'@/lib/native/authority':{readAuthorizedNativeSession:read,nativeFailure}}).GET as(request:Request)=>Promise<Response>;
 for(const cookie of ['', 'clara_auth_session=default','clara_auth_session=invalid','clara_auth_session='+ 'A'.repeat(43)+'; clara_auth_session='+ 'B'.repeat(43)]){
  const response=await get(new Request('https://fixture.invalid/api/clara/session',{headers:{cookie}}));assert.equal(response.status,401);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(!('mission' in await response.json()));
 }
 assert.equal(reads,0);
});
test('default, external and absent explicit selectors cannot resume a global/native fallback',async()=>{
 let reads=0;const read=createNativeAuthority(async()=>{reads++;return [{data:{mission:{id:'must-not-return'}}}];});
 const base='https://fixture.invalid/api/clara/session?workspaceId=w&clientId=c&projectId=p&sessionId=';
 for(const url of [base+'default',base+'external:live-thread','https://fixture.invalid/api/clara/session',base+'native:a&projectId=other'])await assert.rejects(()=>read(new Request(url,{headers:{cookie:'clara_auth_session='+'A'.repeat(43)}})),RegistryError);
 assert.equal(reads,0);
});
test('every fenced native HTTP handler refuses anonymous/invalid cookies without entering legacy business logic',async()=>{
 const roots=['src/app/api/clara','src/app/api/missions','src/app/api/documents','src/app/api/contacts','src/app/api/calendar','src/app/api/workspace/install','src/app/api/openai/test','src/app/api/internal/prospect-e2e-trace'];
 const files=roots.flatMap(root=>readdirSync(root,{recursive:true,withFileTypes:true}).filter(f=>f.isFile()&&f.name==='route.ts').map(f=>resolve(f.parentPath,f.name))).filter(file=>readFileSync(file,'utf8').match(/nativeOperationFence|nativeRequest|withNativeScope/));
 let checked=0;
 for(const file of files){
  const imports=new Set([...readFileSync(file,'utf8').matchAll(/from\s+["']([^"']+)["']/g)].map(match=>match[1]));
  const modules:Record<string,unknown>={};let legacyCalls=0;
  for(const name of imports)modules[name]=new Proxy({},{get:()=>function(){legacyCalls++;throw Error('Legacy code reached');}});
  modules['@/lib/native/authority']={nativeOperationFence,nativeFailure};modules['@/lib/native/scoped-context']={nativeRequest,withNativeScope,nativeContext};modules['next/server']={NextResponse:Response};
  const exported=compiled(file,modules);
  for(const method of ['GET','POST','PATCH','DELETE'])if(typeof exported[method]==='function')for(const cookie of ['', 'clara_auth_session=invalid']){
    const request=new Request('https://fixture.invalid/native',{method,headers:{cookie}});
    const response=await (exported[method] as(request:Request)=>Promise<Response>)(request);
    assert.equal(response.status,401,`${file} ${method}`);assert.equal(legacyCalls,0,file);checked++;
  }
 }
 assert.ok(checked>=30);console.info(`Checked ${checked} native handler refusals.`);
});

test('unavailable authority never leaks storage details or resumes the legacy runtime',async()=>{
 const read=createNativeAuthority(async()=>{throw Error('PRIVATE_PROVIDER_CONNECTION');});
 const get=compiled('src/app/api/clara/session/route.ts',{'@/lib/native/authority':{readAuthorizedNativeSession:read,nativeFailure}}).GET as(request:Request)=>Promise<Response>;
 const request=new Request('https://fixture.invalid/api/clara/session?workspaceId=w&clientId=c&projectId=p&sessionId=native:a',{headers:{cookie:'clara_auth_session='+'A'.repeat(43)}});
 const response=await get(request);assert.equal(response.status,503);assert.deepEqual(await response.json(),{success:false,code:'NATIVE_AUTHORITY_UNAVAILABLE'});assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('even an explicitly authorized snapshot cannot unlock legacy native mutations',async()=>{
 let reads=0;
 const authority=compiled('src/lib/native/authority.ts',{'@/lib/core/store/database':{sql:async()=>{reads++;return [{data:{state:'WORKING',mission:null}}];}},'@/lib/canonical/registry':{RegistryError,registryContext,opaque}});
 const response=await (authority.nativeOperationFence as(request:Request)=>Promise<Response>)(new Request('https://fixture.invalid/api/clara/chat?workspaceId=w&clientId=c&projectId=p&sessionId=native:a',{headers:{cookie:'clara_auth_session='+'A'.repeat(43)}}));
 assert.equal(reads,1);assert.equal(response.status,503);assert.deepEqual(await response.json(),{success:false,code:'NATIVE_SCOPED_OPERATION_UNAVAILABLE'});
});

test('all six native server pages return before invoking any global data loader',async()=>{
 let checked=0;
 for(const file of ['src/app/page.tsx','src/app/clara/page.tsx','src/app/missions/page.tsx','src/app/journal/page.tsx','src/app/brain/page.tsx','src/app/conversations/page.tsx']){
  const modules:Record<string,unknown>={};let legacyCalls=0;
  for(const match of readFileSync(file,'utf8').matchAll(/from\s+["']([^"']+)["']/g))modules[match[1]]=new Proxy({},{get:()=>()=>{legacyCalls++;throw Error('Global loader reached');}});
  const locked={locked:true};modules['@/lib/native/page-fence']={nativePageFence:async()=>locked,nativePage:async()=>locked};
  const page=compiled(file,modules).default as(props:{searchParams:Promise<Record<string,string>>})=>Promise<unknown>;assert.equal(await page({searchParams:Promise.resolve({})}),locked);assert.equal(legacyCalls,0,file);checked++;
 }
 assert.equal(checked,6);
});

test('reopened chat and native runtime/document handlers still refuse invalid authentication before business code',async()=>{
 let checked=0;
 for(const file of ['src/app/api/clara/chat/route.ts','src/app/api/native/runtime/route.ts','src/app/api/native/documents/authorization/route.ts']){
  const modules:Record<string,unknown>={};let business=0;
  for(const match of readFileSync(file,'utf8').matchAll(/from\s+["']([^"']+)["']/g))modules[match[1]]=new Proxy({},{get:()=>()=>{business++;throw Error('Business/provider reached');}});
  modules['@/lib/native/scoped-context']={nativeRequest,nativeContext,nativeCommand,withNativeScope};
  modules['@/lib/native/authority']={nativeSelectors:(await import('../lib/native/authority')).nativeSelectors,nativeFailure};
  modules['@/lib/canonical/registry']={RegistryError,registryContext,opaque};modules['@/lib/canonical/http']={fields,registryBody,sameOrigin};
  const handlers=compiled(file,modules);
  for(const method of ['GET','POST'])if(typeof handlers[method]==='function')for(const cookie of ['', 'clara_auth_session=invalid']){
   const request=new Request('https://fixture.invalid/api/native/runtime',{method,headers:{cookie,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:'{"action":"createSession","workspaceId":"foreign","clientId":"foreign","projectId":"foreign"}'}:{})});
   const response=await (handlers[method] as(request:Request)=>Promise<Response>)(request);assert.equal(response.status,401,file);assert.equal(business,0,file);checked++;
  }
 }
 assert.equal(checked,8);
});

test('server instrumentation never imports or starts a global business runtime',async()=>{
 let calls=0;
 const startupExports=compiled('instrumentation.ts',{'./src/lib/core/runtime':{startRuntime:async()=>{calls++;throw Error('Global startup forbidden');}}});
 await (startupExports.register as()=>Promise<void>)();assert.equal(calls,0);
 assert.ok(!readFileSync('instrumentation.ts','utf8').includes('import('));
});

const uncertifiedConnectorRoutes = [
 ['src/app/api/connections/google/route.ts','GET'],
 ['src/app/api/connections/google/connect/route.ts','GET'],
 ['src/app/api/connections/google/callback/route.ts','GET'],
 ['src/app/api/connections/make/configure/route.ts','POST'],
 ['src/app/api/connections/make/status/route.ts','GET'],
 ['src/app/api/connections/make/verify/route.ts','POST'],
 ['src/app/api/connections/brevo/route.ts','GET'],
 ['src/app/api/connections/brevo/connect/route.ts','GET'],
 ['src/app/api/connections/brevo/callback/route.ts','GET'],
] as const;
function fencedConnector(file:string, fence:typeof nativeOperationFence, onLegacy:()=>void){
 const modules:Record<string,unknown>={};
 for(const match of readFileSync(file,'utf8').matchAll(/from\s+["']([^"']+)["']/g))
  modules[match[1]]=new Proxy({},{get:()=>function(){onLegacy();throw Error('Uncertified connector reached');}});
 modules['@/lib/native/authority']={nativeOperationFence:fence};
 return compiled(file,modules);
}
test('Uncertified Google/Brevo/Make connection routes reject invalid OS sessions before storage or provider I/O',async()=>{
 let legacyCalls=0;
 for(const [file,method] of uncertifiedConnectorRoutes){
  const handler=fencedConnector(file,nativeOperationFence,()=>legacyCalls++)[method] as(request:Request)=>Promise<Response>;
  for(const cookie of ['', 'clara_auth_session=invalid', 'clara_auth_session='+ 'A'.repeat(43)+'; clara_auth_session='+ 'B'.repeat(43)]){
   const response=await handler(new Request('https://fixture.invalid/api?state=synthetic&code=synthetic',{method,headers:{cookie}}));
   assert.equal(response.status,401,file);assert.equal(response.headers.get('Cache-Control'),'no-store');
  }
 }
 assert.equal(legacyCalls,0);
});
test('a verified native session cannot unlock Google credentials or Make configuration before connector certification',async()=>{
 let legacyCalls=0,authorityReads=0;
 const authority=compiled('src/lib/native/authority.ts',{
  '@/lib/core/store/database':{sql:async()=>{authorityReads++;return [{data:{state:'WORKING',mission:null}}];}},
  '@/lib/canonical/registry':{RegistryError,registryContext,opaque},
 });
 for(const [file,method] of uncertifiedConnectorRoutes){
  const handler=fencedConnector(file,authority.nativeOperationFence as typeof nativeOperationFence,()=>legacyCalls++)[method] as(request:Request)=>Promise<Response>;
  const response=await handler(new Request('https://fixture.invalid/api?workspaceId=w&clientId=c&projectId=p&sessionId=native:a',{method,headers:{cookie:'clara_auth_session='+ 'A'.repeat(43)}}));
  assert.equal(response.status,503,file);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(await response.json(),{success:false,code:'NATIVE_SCOPED_OPERATION_UNAVAILABLE'});
 }
 assert.equal(authorityReads,uncertifiedConnectorRoutes.length);assert.equal(legacyCalls,0);
});
