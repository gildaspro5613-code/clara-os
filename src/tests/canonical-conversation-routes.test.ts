import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {conversationLinks} from '../lib/canonical/conversation-links';
import * as http from '../lib/canonical/http';
import {opaque,RegistryError} from '../lib/canonical/registry';
function load(file:string,modules:Record<string,unknown>){const exports:Record<string,unknown>={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>{if(!(name in modules))throw Error('Unexpected module '+name);return modules[name];},URL,Number});return exports as Record<string,(r:Request)=>Promise<Response>>;}
test('native conversation HTTP entrypoints reject missing/invalid cookies before SQL or transport',async()=>{
 let sql=0,network=0;const links=conversationLinks(async()=>{sql++;return [];},async()=>{network++;throw Error('Forbidden transport');});
 const handlers=load('src/app/api/native/conversation-links/route.ts',{'@/lib/canonical/conversation-links':{canonicalConversationLinks:links},'@/lib/canonical/http':http,'@/lib/canonical/registry':{opaque,RegistryError}});
 const prior=process.env.CLARA_AUTH_APP_ORIGIN;process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
 try{for(const cookie of ['', 'clara_auth_session=invalid']){
  const headers={cookie,origin:'https://os.fixture.example','Content-Type':'application/json'};
  const get=await handlers.GET(new Request('https://os.fixture.example/api/native/conversation-links?id=link',{headers}));assert.equal(get.status,401);
  for(const body of [{action:'request',requestId:'synthetic-request-001',liveConversationId:'chat-a'},{action:'approve',id:'link',expectedRevision:1,approve:true},{action:'revoke',id:'link',expectedRevision:2,approve:true}]){
   const r=await handlers.POST(new Request('https://os.fixture.example/api/native/conversation-links',{method:'POST',headers,body:JSON.stringify(body)}));assert.equal(r.status,401);assert.equal(r.headers.get('Cache-Control'),'no-store');
  }
 }assert.equal(sql,0);assert.equal(network,0);
 const foreign=await handlers.POST(new Request('https://os.fixture.example/api/native/conversation-links',{method:'POST',headers:{origin:'https://foreign.invalid','Content-Type':'application/json'},body:'{}'}));assert.equal(foreign.status,403);
 }finally{if(prior===undefined)delete process.env.CLARA_AUTH_APP_ORIGIN;else process.env.CLARA_AUTH_APP_ORIGIN=prior;}
});
test('product HTTP boundary requires distinct capability and exact configured workspace; no read/archive/hardware fallback',async()=>{
 let calls=0;let product:null|{workspaceId:string;capabilities:string[]}=null;
 const handlers=load('src/app/api/core/canonical/conversations/route.ts',{
  '@/lib/canonical/conversation-links':{CONVERSATION_LINK_CAPABILITY:'conversation:link',canonicalConversationLinks:{product:async(w:string,id:string,op:string)=>{calls++;return {w,id,op};}}},
  '@/lib/external-capabilities/config':{authenticateExternalProduct:()=>product},'@/lib/canonical/http':http,'@/lib/canonical/registry':{opaque,RegistryError}
 });
 const request=(action='inspect')=>new Request('https://os.fixture.example/api/core/canonical/conversations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer synthetic','x-clara-product':'clara-live'},body:JSON.stringify({action,associationId:'link'})});
 assert.equal((await handlers.POST(request())).status,401);
 for(const capability of ['read','archive','voice:conversation','hardware:execute']){product={workspaceId:'server-workspace',capabilities:[capability]};assert.equal((await handlers.POST(request())).status,403);}assert.equal(calls,0);
 product={workspaceId:'server-workspace',capabilities:['conversation:link']};
 for(const [action,op] of [['inspect','inspectProduct'],['authorize','authorizeProduct'],['stop','stopProduct']]){const response=await handlers.POST(request(action));assert.equal(response.status,200);assert.deepEqual((await response.json()).data,{w:'server-workspace',id:'link',op});}
 assert.equal((await handlers.POST(request('executeHardware'))).status,400);assert.equal(calls,3);
});
