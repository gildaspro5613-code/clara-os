import test from "node:test";
import assert from "node:assert/strict";
import {writeFileSync} from "node:fs";
import {randomBytes} from "node:crypto";
import {moduleFrom} from "./helpers/production-p0-harness";
import {isolatedPostgres} from "./helpers/isolated-postgres";
import {createEventJobStore,publicJob} from "@/lib/external-capabilities/event-jobs";
import {runEventJob} from "@/lib/external-capabilities/event-job-worker";
import {routeHarness} from "./helpers/external-event-route-harness";
import {sessionKey} from "@/lib/external-capabilities/external-event-handler";
import {EventType,type Event} from "@/types";
import {buildContext} from "@/lib/brain/context";
import {buildBrainSources} from "@/lib/brain/brain-source-registry";
import {reasoning} from "@/lib/brain/reasoning";
import {OpenAIResponsesEngine} from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import {createSession,type ClaraSession} from "@/lib/core/session";
const container=process.env.DOCUMENT_OPERATION_TEST_CONTAINER;
const id=()=>randomBytes(32).toString('hex');

test("P0-B: real durable session survives new runtime/navigation, ordered history and project/user/session isolation",{skip:!container},async(t)=>{
 const pg=isolatedPostgres(container),prefix=id(),prompts:string[]=[];let executions=0;
 const stores=moduleFrom("src/lib/core/store/session-store.ts",{"./database":{sql:pg.query}}) as typeof import("@/lib/core/store/session-store");
 t.mock.method(OpenAIResponsesEngine.prototype,"generate",async(input)=>{prompts.push(input.prompt);return {success:true,responseStatus:"completed",content:JSON.stringify({intent:"Advice",summary:"Use existing context",confidence:1,entities:[],actions:[],nextAction:"Review",importance:1,urgency:0,impact:1}),message:"Synthetic",completedAt:new Date()};});
 const mission={id:prefix,title:"Scoped advice",objective:"Prepare",status:"active",tasks:[{id:"task",title:"Must not execute",completed:false,execution:{capabilityId:"write-project"}}]};
 const missions={missionFromBrain:()=>({...mission}),executeMissionTask:async()=>{executions++;throw Error("Advice cannot execute");},completeMissionTask:()=>mission,canExecuteAutonomously:()=>true};
 const orchestrator=moduleFrom("src/lib/core/orchestrator.ts",{
  "@/modules/missions":missions,"@/modules/missions/mission-store":{saveMission:async()=>{}},
  "@/lib/brain":{runBrainDashboard:async(event:Event)=>{await reasoning(buildContext(event),{shortTerm:[],longTerm:[],facts:[]},await buildBrainSources(event,new Date()));return {context:buildContext(event),sources:[],recommendation:null};}},
 }) as typeof import("@/lib/core/orchestrator");
 const runtime=moduleFrom("src/lib/core/clara.ts",{
  "./store/session-store":stores,"./orchestrator":orchestrator,"@/modules/missions":missions,
  "@/modules/missions/mission-store":{loadMission:async()=>({...mission}),saveMission:async()=>{}},
  "@/modules/missions/current-mission":{getCurrentMission:async()=>{throw Error("External sessions cannot read global mission");}},
  "./journal":{Journal:class{async addEntry(){}}},
 }) as typeof import("@/lib/core/clara");
 const scope={productId:"clara-live",workspaceId:prefix,userId:"alice",sessionId:"thread"};
 const current=(project:string,message:string,override={}):Event=>({id:id(),type:EventType.USER_MESSAGE,source:"EXTERNAL_PRODUCT",timestamp:new Date(),context:{...scope,...override},payload:{message,project:{id:project},context:{live:{adviceOnly:true}}}});
 const key=sessionKey(scope,"project-a");
 const first=await new runtime.Clara(key).processEvent(current("project-a","First scoped request"));
 const time=new Date().toISOString();first.conversation=[{id:"u1",role:"user",content:"First scoped request",createdAt:time},{id:"a1",role:"clara",content:"First scoped answer",createdAt:time}];await stores.saveSession(first,key);
 const second=await new runtime.Clara(key).processEvent(current("project-a","Second scoped request"));
 assert.match(prompts[1],/First scoped request/);assert.match(prompts[1],/First scoped answer/);assert.ok(prompts[1].indexOf("First scoped request")<prompts[1].indexOf("First scoped answer"));assert.equal(second.conversation.length,2);
 await new runtime.Clara(sessionKey(scope,"project-b")).processEvent(current("project-b","Independent B"));assert.ok(!prompts[2].includes("First scoped"));
 for(const [field,value] of [["userId","bob"],["sessionId","other"],["workspaceId","other"]]){
  const nextScope={...scope,[field]:value};await new runtime.Clara(sessionKey(nextScope,"project-a")).processEvent(current("project-a","Isolated",{[field]:value}));assert.ok(!prompts.at(-1)!.includes("First scoped"));
 }
 assert.equal(executions,0);
 await pg.runSql(`DELETE FROM clara_sessions WHERE id IN ('${key}','${sessionKey(scope,"project-b")}')`);
});

test("P0-C/F: actual worker commits failed status and sanitized session atomically, never completes/replays interrupted output",{skip:!container},async()=>{
 const pg=isolatedPostgres(container),store=createEventJobStore(pg.query as unknown as Parameters<typeof createEventJobStore>[0]);
 const jobId=id(),scope=id(),correlation=id().slice(0,32);
 const route=routeHarness(false,undefined,false,undefined,async()=>({content:"Synthetic retained partial",generation:{status:"incomplete",failureCategory:"output_truncated",recoverable:true}}));
 const body={schemaVersion:"clara.unified-core.event.v1",eventType:"USER_MESSAGE",scope:{productId:"clara-live",workspaceId:scope,userId:"alice",sessionId:"thread"},message:"Synthetic request",project:{id:"project-a"},context:{language:"en",live:{adviceOnly:true}}};
 await store.enqueue(scope,jobId,"clara-live","os-workspace",body,correlation);
 assert.equal(await runEventJob(jobId,store,route.execute,()=>route.products),true);
 const saved=await store.lookup(scope,jobId);assert.equal(saved?.status,"failed");assert.equal(saved?.result,null);assert.equal(saved?.failure_category,"output_truncated");
 const key=sessionKey(body.scope,"project-a");
 const stored=JSON.parse((await pg.runSql(`SELECT data FROM clara_sessions WHERE id='${key}'`)).trim()) as ClaraSession;
 assert.equal(stored.conversation.length,2);
 assert.equal(stored.conversation[0].content,"Synthetic request");
 assert.match(stored.conversation[1].content,/Clara could not complete/);
 assert.doesNotMatch(JSON.stringify(stored.conversation),/Synthetic retained partial/);
 assert.equal(stored.conversation[1].generation?.status,"incomplete");
 assert.equal(stored.conversation[1].generation?.recoverable,false);
 assert.equal(await runEventJob(jobId,store,route.execute,()=>route.products),false);assert.equal(route.received.length,1);
 // A completed owner must never be changed by a late failure write.
 const completedId=id();await store.enqueue(scope,completedId,"clara-live","os-workspace",body,correlation);const owner=(await store.claim(completedId))!;
 await store.completeWithSession(owner,{response:"Complete",sessionId:"thread"},createSession(),"synthetic:"+completedId);
 await assert.rejects(store.failWithSession(owner,"output_truncated",stored,key));
 assert.equal((await store.lookup(scope,completedId))?.status,"completed");
 if(process.env.P0_LIVE_CONTRACT_FIXTURE){
   assert.equal(process.env.P0_LIVE_CONTRACT_FIXTURE,"/tmp/clara-p0-job-contract.json");
   writeFileSync(process.env.P0_LIVE_CONTRACT_FIXTURE,JSON.stringify([publicJob(saved!),publicJob((await store.lookup(scope,completedId))!)]));
 }
});

test("P0-B: native OS cannot inherit an external thread through latest-session or global-mission fallback",{skip:!container},async()=>{
 const pg=isolatedPostgres(container),prefix=id();
 const stores=moduleFrom("src/lib/core/store/session-store.ts",{"./database":{sql:pg.query}}) as typeof import("@/lib/core/store/session-store");
 const privateMission={id:prefix,title:"Private Live project",status:"active",tasks:[]};
 const external=createSession();external.mission=privateMission as unknown as NonNullable<ClaraSession['mission']>;external.conversation=[{id:"private",role:"user",content:"PRIVATE LIVE MESSAGE",createdAt:new Date().toISOString()}];
 const externalKey="external:"+prefix;await stores.saveSession(external,externalKey);
 const nativeOwner=await stores.loadMostRecentMissionSession(true);assert.ok(!nativeOwner?.key.startsWith("external:"));
 const context=moduleFrom("src/lib/core/operational-context.ts",{
  "./store/session-store":{...stores,loadMostRecentMissionSession:async()=>null,loadSession:async()=>createSession()},
  "@/modules/missions/current-mission":{getCurrentMission:async()=>privateMission},
  "@/lib/acquisition/acquisition-store":{loadActiveAcquisitionQualifications:async()=>[],loadAcquisitionRecord:async()=>null},
 }) as typeof import("@/lib/core/operational-context");
 const native=await context.resolveOperationalContext();assert.equal(native.sessionKey,"default");assert.equal(native.session.mission,null);assert.equal(native.session.conversation.length,0);
 const runtime=moduleFrom("src/lib/core/clara.ts",{
  "./store/session-store":stores,"@/modules/missions/current-mission":{getCurrentMission:async()=>privateMission},
  "@/modules/missions/mission-store":{loadMission:async()=>null,saveMission:async()=>{}},
  "@/lib/runtime/runtime-factory":{RuntimeFactory:{create:()=>({active:true})}},
  "./journal":{Journal:class{async addEntry(){}}},
 }) as typeof import("@/lib/core/clara");
 const started=await new runtime.Clara("synthetic:"+prefix).start();assert.equal(started.mission,null);assert.equal(started.conversation.length,0);
});

test('Production source budget: compact evidence completes one durable scoped job, without replaying cognition or saving a Live draft',{skip:!container},async(t)=>{
 const {readFileSync}=await import('node:fs');
 const {liveProjectSource}=await import('@/lib/brain/live-project-context');
 const {composeClaraResponseWithProposal}=await import('@/lib/brain/response-composer');
 const pg=isolatedPostgres(container),store=createEventJobStore(pg.query as unknown as Parameters<typeof createEventJobStore>[0]);
 const wire=JSON.parse(readFileSync('docs/reception/production-source-budget-20261109/synthetic-event.json','utf8'));
 wire.scope.sessionId='budget-'+id();
 const source=liveProjectSource({id:id(),type:EventType.USER_MESSAGE,source:'EXTERNAL_PRODUCT',timestamp:new Date(),context:wire.scope,payload:wire})!;
 const session=createSession();session.sources=[source];let generations=0;
 const proposal={schema:'clara.production.proposal.v1',project_id:'A',preparation_id:'prep-A',rows:['constraints','tasks','timeline','coordination','decisions'].map(section=>({section,label:'Réserves du dossier synthétique',value:'Confirmer les dépendances documentées avant toute action.',notes:'doc1 ; à vérifier ; dossier partiel.'}))};
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>{generations++;return {success:true,responseStatus:'completed',content:JSON.stringify(proposal),message:'Synthetic',completedAt:new Date()};});
 const route=routeHarness(false,undefined,false,undefined,()=>composeClaraResponseWithProposal(wire.message,session,'fr',{projectId:'A',preparationId:'prep-A'}));
 const jobId=id(),scope=id();await store.enqueue(scope,jobId,'clara-live','os-workspace',wire,id().slice(0,32));
 assert.equal(await runEventJob(jobId,store,route.execute,()=>route.products),true);
 const saved=await store.lookup(scope,jobId);assert.equal(saved?.status,'completed');assert.equal(generations,1);
 assert.deepEqual(JSON.parse((saved?.result as {response:string}).response),proposal);
 assert.equal(await store.lookup('foreign-scope',jobId),null);
 assert.equal(await runEventJob(jobId,store,route.execute,()=>route.products),false);assert.equal(generations,1);
 const key=sessionKey(wire.scope,'A');const durable=JSON.parse((await pg.runSql(`SELECT data FROM clara_sessions WHERE id='${key}'`)).trim()) as ClaraSession;
 assert.equal(durable.conversation.length,2);assert.equal(durable.conversation[1].content,JSON.stringify(proposal));
 // Only OS session/job receipts are persisted by this harness: no Live writer or hardware adapter exists in this path.
 assert.equal(route.metrics.documentAnalyses,0);
});
