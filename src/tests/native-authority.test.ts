import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import vm from "node:vm";
import ts from "typescript";
import {createNativeAuthority,nativeOperationFence,nativeFailure} from "../lib/native/authority";
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
 const files=roots.flatMap(root=>readdirSync(root,{recursive:true,withFileTypes:true}).filter(f=>f.isFile()&&f.name==='route.ts').map(f=>resolve(f.parentPath,f.name))).filter(file=>readFileSync(file,'utf8').includes('nativeOperationFence'));
 let checked=0;
 for(const file of files){
  const imports=new Set([...readFileSync(file,'utf8').matchAll(/from\s+["']([^"']+)["']/g)].map(match=>match[1]));
  const modules:Record<string,unknown>={};let legacyCalls=0;
  for(const name of imports)modules[name]=new Proxy({},{get:()=>function(){legacyCalls++;throw Error('Legacy code reached');}});
  modules['@/lib/native/authority']={nativeOperationFence};modules['next/server']={NextResponse:Response};
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
  const locked={locked:true};modules['@/lib/native/page-fence']={nativePageFence:async()=>locked};
  const page=compiled(file,modules).default as(props:{searchParams:Promise<Record<string,string>>})=>Promise<unknown>;assert.equal(await page({searchParams:Promise.resolve({})}),locked);assert.equal(legacyCalls,0,file);checked++;
 }
 assert.equal(checked,6);
});
