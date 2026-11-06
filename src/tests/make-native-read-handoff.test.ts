import test from "node:test";
import assert from "node:assert/strict";
import {executeScopedMakeRead,MakeNativeReadUnavailable} from "@/lib/native/make-read-handoff";
import {MAKE_CAPABILITIES} from "@/lib/connectors/make/definition";
import type {MakeReadAuthority,MakeReadCapability,MakeReadProof} from "@/lib/native/make-read-handoff";

const scope={workspaceId:"md-fixture",clientId:"client-a",projectId:"project-a"};
const principal="owner-a";
const selection="find-drive-document";
const input={query:"fixture-only",missionId:"mission-a"};
const proof:MakeReadProof={...scope,ownerUserId:principal,connectionId:"make-connection",scenarioKey:selection,revision:1};
const receipt={capabilityId:MAKE_CAPABILITIES.SCENARIO_EXECUTE,success:true,provider:"make",connectionId:"make-connection",status:"completed" as const,
 data:{ok:true,scenarioKey:selection,status:200,executionStatus:"completed",data:{status:"completed",provider:"google-drive",fileId:null,fileName:null}}};
const denied=(code:string)=>(e:unknown)=>e instanceof MakeNativeReadUnavailable&&e.code===code;
test("scoped authorized READ reaches only registered scenario and returns bounded untrusted Brain context",async()=>{
 let checks=0,calls=0;
 const authority:MakeReadAuthority={async authorize(req){checks++;assert.deepEqual(req,{...scope,userId:principal,scenarioKey:selection});return proof;}};
 const capability:MakeReadCapability={async execute(capabilityId,workspaceId,context){calls++;assert.equal(capabilityId,MAKE_CAPABILITIES.SCENARIO_EXECUTE);assert.equal(workspaceId,scope.workspaceId);assert.deepEqual(context,{scenarioKey:selection,payload:{...input,workspaceId:scope.workspaceId}});return receipt;}};
 const result=await executeScopedMakeRead(scope,principal,"mission-a",selection,input,authority,capability);
 assert.equal(result.available,true);
 assert.equal(result.source,"google-drive");
 assert.deepEqual((result.data as {results:unknown}).results,receipt.data.data);
 assert.match(result.summary,/Untrusted external READ result/);
 assert.equal(checks,2);assert.equal(calls,1);
});
test("no native authority means no Make provider calls",async()=>{
 let calls=0;
 await assert.rejects(()=>executeScopedMakeRead(scope,principal,"mission-a",selection,input,{authorize:async()=>null},{execute:async()=>{calls++;return receipt;}}),denied("NATIVE_MAKE_AUTHORITY_REQUIRED"));
 assert.equal(calls,0);
});
test("cross-client, user or project proof is refused before calling Make",async()=>{
 for(const mismatch of [{clientId:"client-b"},{projectId:"project-b"},{ownerUserId:"intruder"},{workspaceId:"other"},{scenarioKey:"search-calendar-events" as const}]){
  let calls=0;
  await assert.rejects(()=>executeScopedMakeRead(scope,principal,"mission-a",selection,input,{authorize:async()=>({...proof,...mismatch}) as MakeReadProof},{execute:async()=>{calls++;return receipt;}}),denied("NATIVE_MAKE_SCOPE_DENIED"));
  assert.equal(calls,0);
 }
});
test("unknown or WRITE/SEND scenario names and mission spoofing cannot reach provider",async()=>{
 let calls=0,auth=0;
 const authority={authorize:async()=>{auth++;return proof;}};
 const cap={execute:async()=>{calls++;return receipt;}};
 for(const key of ["notify-team","archive-document","create-calendar-event","7291299","__proto__"]){
  await assert.rejects(()=>executeScopedMakeRead(scope,principal,"mission-a",key,input,authority,cap),denied("NATIVE_MAKE_READ_ONLY"));
 }
 await assert.rejects(()=>executeScopedMakeRead(scope,principal,"mission-a",selection,{...input,missionId:"mission-other"},authority,cap),denied("MAKE_READ_MISSION_DENIED"));
 await assert.rejects(()=>executeScopedMakeRead(scope,principal,"mission-a",selection,{...input,recipient:"another@example.test"},authority,cap),denied("MAKE_READ_INPUT_INVALID"));
 assert.equal(calls,0);assert.equal(auth,0);
});
test("revocation or changed authorization after provider response prevents Brain exposure",async()=>{
 let checks=0;
 const authority={authorize:async()=>{checks++;return checks===1?proof:{...proof,revision:2};}};
 const cap={execute:async()=>receipt};
 await assert.rejects(()=>executeScopedMakeRead(scope,principal,"mission-a",selection,input,authority,cap),denied("NATIVE_MAKE_AUTHORITY_REVOKED"));
 assert.equal(checks,2);
});
test("pending result, wrong provider, connection or failed business receipt are refused",async()=>{
 const authority={authorize:async()=>proof};
 for(const changed of [
  {status:"accepted" as const},
  {provider:"google"},
  {connectionId:"other"},
  {data:{...receipt.data,executionStatus:"accepted"}},
  {data:{...receipt.data,data:{status:"failed"}}},
 ]){
  await assert.rejects(()=>executeScopedMakeRead(scope,principal,"mission-a",selection,input,authority,{execute:async()=>({...receipt,...changed})}),e=>e instanceof MakeNativeReadUnavailable);
 }
});
