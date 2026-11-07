import test from "node:test";
import assert from "node:assert/strict";
import type {ConnectionResolver} from "@/lib/connections/connection-resolver";
import {MakeConnectorAdapter} from "@/lib/connectors/make/adapter";
import {MakeOnDemandClient} from "@/lib/connectors/make/on-demand-client";
import {MakeWebhookError} from "@/lib/connectors/make/client";
import {MAKE_CAPABILITIES} from "@/lib/connectors/make/definition";

const makeApi={token:"fixture-secret-not-sent-to-logs",zone:"eu1"};
const scenario={transport:"api" as const,scenarioId:7295042};
const invocation={scenarioKey:"find-drive-document",payload:{workspaceId:"isolated-workspace",query:"fixture-no-match"}};
const url="https://eu1.make.com/api/v2/scenarios/7295042/run";

test("existing on-demand READ scenario uses Make v2 API with secret from credential store only",async()=>{
 const calls:{url:string;init?:RequestInit}[]=[];
 const resolver={async resolve(id:string,provider:string){
  assert.equal(id,"connection-fixture");assert.equal(provider,"make");
  return {credentials:{api:makeApi,scenarios:{"find-drive-document":scenario}}};
 }} as unknown as ConnectionResolver;
 const adapter=new MakeConnectorAdapter(resolver,async(input,init)=>{
  calls.push({url:String(input),init});
  return Response.json({executionId:"mock-exec-1",status:1,outputs:{status:"completed",provider:"google-drive",fileId:null}});
 });
 const result=await adapter.execute("connection-fixture",{capability:MAKE_CAPABILITIES.SCENARIO_EXECUTE,input:invocation});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,url);
 assert.equal(new Headers(calls[0].init?.headers).get("authorization"),"Token "+makeApi.token);
 assert.deepEqual(JSON.parse(String(calls[0].init?.body)),{data:invocation.payload,responsive:true});
 const receipt=result.data as {executionStatus:string;executionId?:string;data:unknown};
 assert.equal(receipt.executionStatus,"completed");
 assert.equal(receipt.executionId,"mock-exec-1");
 assert.deepEqual(receipt.data,{status:"completed",provider:"google-drive",fileId:null});
});

test("on-demand PREPARE makes no credential request and no provider call",async()=>{
 let called=false;
 const adapter=new MakeConnectorAdapter({async resolve(){called=true;throw Error("unsafe");}} as unknown as ConnectionResolver,async()=>{called=true;throw Error("unsafe");});
 const result=await adapter.execute("fixture",{capability:MAKE_CAPABILITIES.SCENARIO_PREPARE,input:invocation});
 assert.equal((result.data as {prepared:boolean}).prepared,true);assert.equal(called,false);
});

test("on-demand mode refuses invalid zone, ID, missing token and payload without making requests",async()=>{
 const client=new MakeOnDemandClient(async()=>{throw Error("provider should never be called");});
 for(const credentials of [{token:"s",zone:"https://evil.test"},{token:"s",zone:"eu1.make.com"},{token:"",zone:"eu1"}]){
  await assert.rejects(()=>client.execute(scenario,credentials,invocation),e=>e instanceof MakeWebhookError&&e.code==="INVALID_CONFIGURATION");
 }
 await assert.rejects(()=>client.execute({transport:"api",scenarioId:0},makeApi,invocation),e=>e instanceof MakeWebhookError&&e.code==="INVALID_CONFIGURATION");
 await assert.rejects(()=>client.execute(scenario,makeApi,{...invocation,payload:[] as unknown as Record<string,unknown>}),e=>e instanceof MakeWebhookError&&e.code==="INVALID_CONFIGURATION");
});

test("Make status warning/error/unconfirmed and HTTP failures never certify completion",async()=>{
 for(const result of [{status:2},{status:3},{status:"success"},{status:"completed"},{outputs:{ok:true}},null,{status:1,outputs:{status:"failed"}},{status:"1",outputs:{ok:false}}]){
  let calls=0;
  const client=new MakeOnDemandClient(async()=>{calls++;return Response.json(result);});
  await assert.rejects(()=>client.execute(scenario,makeApi,invocation),e=>e instanceof MakeWebhookError&&!e.retryable);
  assert.equal(calls,1);
 }
 for(const result of [Response.json({status:1},{status:503}),new DOMException("timed out","AbortError"),new Error("lost acknowledgement")]){
  let calls=0;
  const client=new MakeOnDemandClient(async()=>{calls++;if(result instanceof Error)throw result;return result;});
  await assert.rejects(()=>client.execute(scenario,makeApi,invocation),e=>e instanceof MakeWebhookError&&!e.retryable);
  assert.equal(calls,1);
 }
});

test("webhook compatibility stays unchanged for previously configured scenarios",async()=>{
 let captured="";
 const resolver={async resolve(){return {credentials:{scenarios:{"old-webhook":{url:"https://hook.eu2.make.com/fixture"}}}}}} as unknown as ConnectionResolver;
 const adapter=new MakeConnectorAdapter(resolver,async(input)=>{captured=String(input);return Response.json({executionStatus:"accepted"});});
 const result=await adapter.execute("fixture",{capability:MAKE_CAPABILITIES.SCENARIO_EXECUTE,input:{scenarioKey:"old-webhook"}});
 assert.equal(captured,"https://hook.eu2.make.com/fixture");
 assert.equal((result.data as {executionStatus:string}).executionStatus,"accepted");
});

test("unknown on-demand scenario key cannot dispatch to arbitrary scenario IDs",async()=>{
 let called=false;
 const resolver={async resolve(){return {credentials:{api:makeApi,scenarios:{"find-drive-document":scenario}}}}} as unknown as ConnectionResolver;
 const adapter=new MakeConnectorAdapter(resolver,async()=>{called=true;return Response.json({status:1});});
 await assert.rejects(()=>adapter.execute("fixture",{capability:MAKE_CAPABILITIES.SCENARIO_EXECUTE,input:{scenarioKey:"7291299"}}),/not configured/);
 assert.equal(called,false);
});
