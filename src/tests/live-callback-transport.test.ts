import test from 'node:test';
import assert from 'node:assert/strict';
import {executeExternalProductCapability} from '@/lib/external-capabilities/product-callback';
const product={productId:'clara-live',workspaceId:'os-workspace',token:'synthetic-only',capabilities:[],callbackBaseUrl:'https://live.fixture.example'};
const request={capability:'get_spatial_readiness',userId:'live-user',workspaceId:'live-project',sessionId:'explicit-session',context:{}};
async function mocked(fetcher:typeof fetch,run:()=>Promise<void>){const previous=globalThis.fetch;globalThis.fetch=fetcher;try{await run();}finally{globalThis.fetch=previous;}}
test('Live transport refuses success without a structured result',async()=>{
 for(const result of [undefined,null,'not a result',[],42])await mocked(async()=>Response.json({success:true,result}),async()=>assert.equal((await executeExternalProductCapability(product,request)).success,false));
});
test('Live transport rejects oversized response before decoding and never retries',async()=>{
 let calls=0;const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(65537));c.close();}});
 await mocked(async()=>{calls++;return new Response(body);},async()=>assert.equal((await executeExternalProductCapability(product,request)).success,false));
 assert.equal(calls,1);assert.equal(body.locked,false);
});
test('Live transport refuses redirects and binds its timeout to the body read',async()=>{
 await mocked(async(_url,init)=>{assert.equal(init?.redirect,'error');assert.ok(init?.signal);return Response.json({success:true,result:{status:'partial',missing:['venue']}});},async()=>{
 const result=await executeExternalProductCapability(product,request);assert.equal(result.success,true);assert.deepEqual(JSON.parse(result.content!),{status:'partial',missing:['venue']});
 });
});
test('Live network and malformed responses fail without leaking errors or retrying',async()=>{
 for(const fetcher of [async()=>{throw new Error('PRIVATE_PROVIDER_DETAIL');},async()=>new Response('{broken'),async()=>Response.json({success:true,result:{},message:'x'.repeat(2001)})]){
 let calls=0;await mocked(async()=>{calls++;return fetcher();},async()=>{const result=await executeExternalProductCapability(product,request);assert.equal(result.success,false);assert.ok(!JSON.stringify(result).includes('PRIVATE_PROVIDER_DETAIL'));});assert.equal(calls,1);
 }
});
test('Live timeout aborts a stalled body and leaves an uncertain outcome without retry',async()=>{
 let calls=0;
 await mocked(async(_url,init)=>{calls++;return new Response(new ReadableStream({start(c){init!.signal!.addEventListener('abort',()=>c.error(new Error('aborted')),{once:true});}}));},async()=>{
 const started=performance.now();const result=await executeExternalProductCapability(product,request);assert.equal(result.success,false);assert.match(result.message,/reconcile/);assert.ok(performance.now()-started>=4500);
 });assert.equal(calls,1);
});
