import test from "node:test";
import assert from "node:assert/strict";
import {moduleFrom} from "./helpers/production-p0-harness";
import { EventType, type Event } from "@/types";
import { createSession } from "@/lib/core/session";
import { liveProjectSource } from "@/lib/brain/live-project-context";
import { buildBrainSources } from "@/lib/brain/brain-source-registry";
import { buildDriveContext } from "@/lib/brain/drive-context";
import { reasoning } from "@/lib/brain/reasoning";
import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import { composeClaraResponseWithProposal } from "@/lib/brain/response-composer";
import { responseGeneration } from "@/lib/brain/response-generation";
import { withPersistedConversation } from "@/lib/core/conversation-context";
import { rememberEvent, clearRememberedEvents } from "@/lib/brain/memory-store";
import { loadMemory } from "@/lib/brain/memory";
import { buildContext } from "@/lib/brain/context";
import { routeHarness } from "./helpers/external-event-route-harness";
import { sessionKey,parseBody } from "@/lib/external-capabilities/external-event-handler";
import type { OpenAIResponsesResult } from "@/lib/connectors/internal/openai/responses/openai-responses-result";

const event=(project="project-a",user="alice",session="session-a"):Event=>({id:crypto.randomUUID(),type:EventType.USER_MESSAGE,source:"EXTERNAL_PRODUCT",timestamp:new Date(),
 context:{productId:"clara-live",workspaceId:"shared-workspace",userId:user,sessionId:session},
 payload:{message:"Prépare la suite.",project:{id:project,name:"Synthetic project"},context:{language:"fr",live:{adviceOnly:true,preparationId:"prep-a"},
 activePreparation:{id:"prep-a",items:[{id:"venue",label:"Lieu",value:"Synthetic venue",status:"confirmed",source_document_id:"doc-a"},{id:"crew",label:"Équipe",value:"",status:"missing"}],productionWorksheet:{rows:[{label:"Montage",time:"08:00",status:"to_verify"}]}},
 projectContext:{project:{id:project},documents:[{id:"doc-a",filename:"Associated.pdf",text:'Original quote: "Keep this wording"',project_id:project},{id:"foreign",filename:"Foreign.pdf",text:"PRIVATE FOREIGN",project_id:"project-b"}],computations:{production:{totals:{crew:3},generated_at:"2026-10-10"}}}}}});
const result=(content:string,extra:Partial<OpenAIResponsesResult>={}):OpenAIResponsesResult=>({success:true,responseStatus:"completed",content,finishReason:"completed",message:"Synthetic",completedAt:new Date(),...extra});


test("P0-A: actual reasoning receives scoped facts, statuses, production, calculations and provenance",async(t)=>{
 const prompts:string[]=[];t.mock.method(OpenAIResponsesEngine.prototype,"generate",async(input)=>{prompts.push(input.prompt);return result(JSON.stringify({intent:"Prepare",summary:"Use verified facts",confidence:1,entities:[],actions:[],nextAction:"Review missing crew",importance:1,urgency:0,impact:1}));});
 const current=event(),sources=await buildBrainSources(current,new Date());
 await reasoning(buildContext(current),{shortTerm:[],longTerm:[],facts:[]},sources);
 for(const value of ["Synthetic venue","confirmed","missing","08:00","to_verify","doc-a","production","crew"])assert.ok(prompts[0].includes(value),value);
 assert.ok(!prompts[0].includes("PRIVATE FOREIGN"));assert.match(prompts[0],/non transmise.*non disponible/);
});

test("P0-A: context limits preserve valid JSON and declare omission without inventing project facts",()=>{
 const current=event();const payload=current.payload as {context:{activePreparation:unknown}};
 payload.context.activePreparation={id:"prep-a",items:Array.from({length:1000},()=>({label:"x".repeat(50000),status:"confirmed"}))};
 const source=liveProjectSource(current)!;assert.ok(source.summary.length<34000);assert.equal((source.data as {truncated:boolean}).truncated,true);
 assert.equal(liveProjectSource({...current,payload:{...(current.payload as object),project:{id:"other"}}}),null);
});

test("P0-B: server history is bounded, chronological, deduplicated and overrides caller-supplied history",()=>{
 const session=createSession();session.conversation=[{id:"u1",role:"user",content:"First request",createdAt:"2026-10-10T10:00:00Z"},{id:"a1",role:"clara",content:"First answer",createdAt:"2026-10-10T10:00:01Z"},{id:"u1",role:"user",content:"Duplicate",createdAt:"2026-10-10T10:00:00Z"}];
 const current=event();current.payload={...(current.payload as object),conversationHistory:[{role:"clara",content:"Foreign caller history"}]};
 const history=(withPersistedConversation(session,current).payload as {conversationHistory:{content:string}[]}).conversationHistory;
 assert.deepEqual(history.map(h=>h.content),["First request","First answer"]);
 const scope={productId:"clara-live",workspaceId:"shared-workspace",userId:"alice",sessionId:"session-a"};
 assert.notEqual(sessionKey(scope,"project-a"),sessionKey(scope,"project-b"));
 for(const key of ["workspaceId","userId","sessionId"] as const)assert.notEqual(sessionKey(scope,"project-a"),sessionKey({...scope,[key]:"other"},"project-a"));
});

test("P0-B: legacy memory cannot leak another user, project or session into reasoning",()=>{
 clearRememberedEvents();const current=event();
 for(const retained of [event("project-b"),event("project-a","bob"),event("project-a","alice","other"),event()])rememberEvent(retained);
 const memory=loadMemory(buildContext(current));assert.equal(memory.shortTerm.length,1);assert.ok(!memory.shortTerm.join().includes('"project-b"'));clearRememberedEvents();
});

test("P0-D: project A/B never loads foreign Drive; legitimate non-project Drive still works",async()=>{
 let calls=0;const {buildDriveContext:isolatedDrive}=moduleFrom("src/lib/brain/drive-context.ts",{"@/lib/connectors/internal/google/drive/google-drive-engine":{GoogleDriveEngine:class {async list(){calls++;return {files:[{fileId:"foreign",fileName:"Foreign Drive",mimeType:"text/plain",url:"https://example.org/foreign"}]};}}}}) as {buildDriveContext:typeof buildDriveContext};
 for(const project of ["project-a","project-b"]){const current=event(project);(current.payload as {message:string}).message="Cherche les documents dans Google Drive";const sources=await buildBrainSources(current,new Date());assert.ok(!sources.some(s=>s.source==='google-drive'));assert.equal((await buildDriveContext(current,new Date(),"foreign")).files.length,0);}
 assert.equal(calls,0);
 const general={id:"general",type:EventType.USER_MESSAGE,source:"USER",timestamp:new Date(),payload:{message:"Cherche dans Drive"}};
 assert.equal((await isolatedDrive(general,new Date(),"legitimate")).files[0].id,"foreign");assert.equal(calls,1);
});

test("P0-C/E: incomplete provider output retains text, suppresses proposals and signals interruption in five languages",async(t)=>{
 let prompt="";t.mock.method(OpenAIResponsesEngine.prototype,"generate",async(input)=>{prompt=input.prompt;assert.equal(input.maxTokens,3200);return result('Original quote: "Keep this wording". Partial sentence\nCLARA_PHYSICAL_ACTION_PROPOSAL:{',{responseStatus:"incomplete",incompleteReason:"max_output_tokens"});});
 for(const locale of ["fr","en","es","de","it"] as const){const session=createSession();const response=await composeClaraResponseWithProposal("Synthetic request",session,locale);assert.equal(response.generation.status,"incomplete");assert.equal(response.generation.failureCategory,"output_truncated");assert.equal(response.generation.recoverable,true);assert.equal(response.physicalAction,undefined);assert.ok(!response.content.includes("CLARA_PHYSICAL_ACTION_PROPOSAL"));assert.match(response.content,/Original quote: "Keep this wording"/);assert.match(prompt,/Préserve les citations/);assert.match(response.content,/interrompue|interrupted|interrumpida|unterbrochen|interrotta/);}
});

test("P0-C: complete, limit, filter, timeout, failure and empty output remain distinct",()=>{
 assert.equal(responseGeneration(result("Complete")).status,"completed");
 assert.equal(responseGeneration(result("Partial",{responseStatus:"incomplete",incompleteReason:"max_output_tokens"})).status,"incomplete");
 assert.equal(responseGeneration(result("Partial",{responseStatus:"incomplete",incompleteReason:"content_filter"})).failureCategory,"output_filtered");
 assert.equal(responseGeneration(result("",{success:false,failureCategory:"provider_timeout"})).status,"timeout");
 assert.equal(responseGeneration(result("",{success:false,failureCategory:"provider_auth"})).status,"failed");
 assert.equal(responseGeneration(result(" ")).failureCategory,"empty_output");
 assert.equal(responseGeneration(result("Partial",{responseStatus:undefined})).status,"failed");
});

test("P0-C/F: actual external handler retains interrupted generation and returns existing Live-compatible failure",async()=>{
 const route=routeHarness(false,undefined,false,undefined,async()=>({content:"Partial text retained",generation:{status:"incomplete",failureCategory:"output_truncated",recoverable:true}}));
 const current=event();const body={schemaVersion:"clara.unified-core.event.v1",eventType:"USER_MESSAGE",scope:{productId:"clara-live",workspaceId:"shared-workspace",userId:"alice",sessionId:"session-a"},...(current.payload as object)};
 let retained:unknown;
 const response=await route.execute({product:route.products.get("clara-live")!,body,correlationId:"a".repeat(32),jobId:"b".repeat(64),progress:async()=>{},persist:async()=>{throw Error("Partial response cannot complete");},persistFailure:async(category,session)=>{assert.equal(category,"output_truncated");retained=session;}});
 assert.equal(response.status,500);assert.equal((await response.json()).failureCategory,"output_truncated");
 assert.equal((retained as {conversation:{generation?:{status:string}}[]}).conversation[1].generation?.status,"incomplete");
});



test("P0-C: provider adapter enforces conversational ceiling and timeout without changing other profiles",async()=>{
 const calls:Record<string,unknown>[]=[],settings:Record<string,unknown>[]=[];
 class APIError extends Error{};class APIConnectionError extends Error{};class APIConnectionTimeoutError extends APIConnectionError{};
 class Client {
  static APIError=APIError;static APIConnectionError=APIConnectionError;static APIConnectionTimeoutError=APIConnectionTimeoutError;
  constructor(options:Record<string,unknown>){settings.push(options);}
  responses={create:async(input:Record<string,unknown>)=>{calls.push(input);return {output:[],output_text:"Partial",status:"incomplete",incomplete_details:{reason:"max_output_tokens"},usage:{output_tokens:input.max_output_tokens}};}};
 }
 const {OpenAIResponsesEngine:Engine}=moduleFrom("src/lib/connectors/internal/openai/responses/openai-responses-engine.ts",{openai:{default:Client}}) as {OpenAIResponsesEngine:typeof OpenAIResponsesEngine};
 const engine=new Engine();const response=await engine.generate({prompt:"Synthetic",maxTokens:100000,outputProfile:"conversation"});
 assert.equal(calls[0].max_output_tokens,3200);assert.equal(settings[0].timeout,60000);assert.equal(settings[0].maxRetries,0);assert.equal(response.finishReason,"incomplete");
 await engine.generate({prompt:"Synthetic",maxTokens:100000});assert.equal(calls[1].max_output_tokens,2000);assert.equal(settings[1].timeout,undefined);
 await engine.generate({prompt:"Synthetic",maxTokens:100000,outputProfile:"document_analysis"});assert.equal(calls[2].max_output_tokens,6000);
});


test("P0-D: missing document identity cannot associate a foreign attachment",()=>{
 const current=event();const payload=current.payload as {context:{projectContext:{documents:unknown[]}};documents:unknown[]};
 payload.context.projectContext.documents=[{filename:"Explicitly scoped document without ID"}];
 payload.documents=[{filename:"Foreign attachment",segments:[{text:"PRIVATE UNASSOCIATED ATTACHMENT"}]}];
 assert.ok(!liveProjectSource(current)!.summary.includes("PRIVATE UNASSOCIATED ATTACHMENT"));
});

test("P0-B: opaque scope identifiers reject controls that could collide in the durable key",()=>{
 const body={schemaVersion:"clara.unified-core.event.v1",eventType:"USER_MESSAGE",message:"Synthetic request",scope:{productId:"clara-live",workspaceId:"w",userId:"alice",sessionId:"thread"}};
 assert.ok(parseBody(body));
 for(const field of ["workspaceId","userId","sessionId"])
  for(const control of ["\u001f","\n","\u007f"])assert.equal(parseBody({...body,scope:{...body.scope,[field]:"first"+control+"second"}}),null);
});
