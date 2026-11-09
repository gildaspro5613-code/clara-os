import {readFileSync} from "node:fs";
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
import { hasCompleteLiveProductionProposal } from "@/lib/brain/live-production-proposal-guard";
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

test("P0-C/Live: only authenticated Production scope requests increased output budget",async(t)=>{
 const requested:{maxTokens?:number;outputProfile?:string}[]=[];
 t.mock.method(OpenAIResponsesEngine.prototype,"generate",async(input)=>{
   requested.push({maxTokens:input.maxTokens,outputProfile:input.outputProfile});
   return result(JSON.stringify({schema:"clara.production.proposal.v1",project_id:"project-a",preparation_id:"prep-a",rows:[{section:"tasks",label:"Verify",value:"Crew to confirm"}]}));
 });
 await composeClaraResponseWithProposal("Synthetic request",createSession(),"fr");
 await composeClaraResponseWithProposal("Synthetic request",createSession(),"fr",{projectId:"project-a",preparationId:"prep-a"});
 assert.deepEqual(requested,[{maxTokens:3200,outputProfile:"conversation"},{maxTokens:5200,outputProfile:"live_production"}]);
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
 assert.equal(response.status,500);
 const failed=await response.json();
 assert.equal(failed.code,"CORE_EVENT_PROCESSING_FAILED");
 assert.equal(failed.failureCategory,"output_truncated");
 assert.equal(failed.data?.sessionId,"session-a");
 assert.equal(failed.data?.response,undefined,"failed Core response must not expose a provider fragment");
 assert.equal(failed.data?.generation?.recoverable,false);
 const history=(retained as {conversation:{id:string;content:string;generation?:{status:string;recoverable:boolean}}[]}).conversation;
 assert.equal(history.length,2);
 assert.equal(history[0].id,"b".repeat(64)+":user");
 assert.equal(history[1].id,"b".repeat(64)+":clara");
 assert.equal(history[1].generation?.status,"incomplete");
 assert.equal(history[1].generation?.recoverable,false);
 assert.doesNotMatch(history[1].content,/Partial text retained/);
 assert.match(history[1].content,/Clara n'a pas pu terminer/);
});



test("P0-C/F: no failed external generation is exposed as a completed assistant answer",async()=>{
 for(const generation of [
   {status:"incomplete" as const,failureCategory:"output_truncated",recoverable:true},
   {status:"incomplete" as const,failureCategory:"output_filtered",recoverable:true},
   {status:"timeout" as const,failureCategory:"provider_timeout",recoverable:true},
   {status:"failed" as const,failureCategory:"provider_failed",recoverable:true},
 ]){
   const route=routeHarness(false,undefined,false,undefined,async()=>({content:"PRIVATE_PARTIAL_PROVIDER_FRAGMENT",generation}));
   const current=event();
   const body={schemaVersion:"clara.unified-core.event.v1",eventType:"USER_MESSAGE",scope:{productId:"clara-live",workspaceId:"shared-workspace",userId:"alice",sessionId:"session-a"},...(current.payload as object)};
   let retained:unknown;let failureCategory:string|undefined;
   const response=await route.execute({
     product:route.products.get("clara-live")!,body,
     correlationId:"a".repeat(32),jobId:"c".repeat(64),progress:async()=>{},
     persist:async()=>{throw Error("Failing generation must not complete");},
     persistFailure:async(category,session)=>{failureCategory=category;retained=session;},
   });
   assert.equal(response.status,500);
   const payload=await response.json();
   assert.equal(payload.failureCategory,generation.failureCategory);
   assert.equal(failureCategory,generation.failureCategory);
   assert.equal(payload.data?.response,undefined);
   assert.doesNotMatch(JSON.stringify(payload),/PRIVATE_PARTIAL_PROVIDER_FRAGMENT/);
   const history=(retained as {conversation:{content:string;generation?:{status:string}}[]}).conversation;
   assert.equal(history.length,2);
   assert.equal(history[1].generation?.status,generation.status);
   assert.doesNotMatch(history[1].content,/PRIVATE_PARTIAL_PROVIDER_FRAGMENT/);
   assert.match(history[1].content,/nouvelle tentative/);
 }
});


test("P0-C/Live: existing Production proposal shape is complete, bounded and tied to the authorized project/preparation",()=>{
 const scope={projectId:"project-a",preparationId:"prep-a"};
 const payload={schema:"clara.production.proposal.v1",project_id:scope.projectId,preparation_id:scope.preparationId,
   rows:[{section:"tasks",label:"Check rigging",value:"Rigging details require confirmation",notes:"Technical rider, page 2"}]};
 const json=JSON.stringify(payload),fence=String.fromCharCode(96).repeat(3);
 assert.equal(hasCompleteLiveProductionProposal("Réserves à valider.\n"+fence+"json\n"+json+"\n"+fence,scope),true);
 assert.equal(hasCompleteLiveProductionProposal(json,scope),true);
 for(const invalid of [
   "Natural prose without machine rows",
   fence+"json\n"+json.slice(0,-2),
   fence+"json\n"+json+"\n"+fence+"\n"+fence+"json\n"+json+"\n"+fence,
   JSON.stringify({...payload,project_id:"project-b"}),
   JSON.stringify({...payload,preparation_id:"prep-b"}),
   JSON.stringify({...payload,rows:[]}),
   JSON.stringify({...payload,rows:[{...payload.rows[0],section:"unauthorized"}]}),
   JSON.stringify({...payload,rows:[{...payload.rows[0],operation_id:"execute"}]}),
   JSON.stringify({...payload,rows:[{...payload.rows[0],label:"x".repeat(301)}]}),
 ])assert.equal(hasCompleteLiveProductionProposal(invalid,scope),false,invalid.slice(0,85));
});

test("P0-C/Live: Production handoff is explicit in the existing composer, without changing the ordinary conversation contract",async(t)=>{
 const scope={projectId:"project-a",preparationId:"prep-a"};
 const value=JSON.stringify({schema:"clara.production.proposal.v1",project_id:"project-a",preparation_id:"prep-a",
   rows:[{section:"tasks",label:"Verify crew",value:"Crew assignments are not confirmed"}]});
 let prompt="";
 t.mock.method(OpenAIResponsesEngine.prototype,"generate",async(input)=>{prompt=input.prompt;return result(value);});
 const session=createSession();
 const complete=await composeClaraResponseWithProposal("Propose des tâches de production",session,"fr",scope);
 assert.equal(complete.generation.status,"completed");
 assert.equal(complete.content,value);
 assert.match(prompt,/clara\.production\.proposal\.v1/);
 assert.match(prompt,/project-a/);
 assert.match(prompt,/prep-a/);
 assert.match(prompt,/aucune proposition|aucun.*statut|aucune.*ligne/i);
 const generic=await composeClaraResponseWithProposal("Bonjour",session,"fr");
 assert.equal(generic.content,value);
 assert.doesNotMatch(prompt,/REMIS LIVE/);
});

test("P0-C/Live: complete provider prose or foreign/invalid JSON fails as an atomic Core job, with no leaked fragment or automatic rewrite",async()=>{
 const current=event();
 const originalContext=(current.payload as {context:Record<string,unknown>}).context;
 const scope={productId:"clara-live",workspaceId:"project-a",userId:"alice",sessionId:"session-a"};
 const body={schemaVersion:"clara.unified-core.event.v1",eventType:"USER_MESSAGE",scope,
   ...(current.payload as object),message:"Prépare la feuille de production.",
   context:{...originalContext,language:"fr",
     live:{adviceOnly:true,preparationId:"prep-a"},
     activePreparation:{id:"prep-a",project_id:"project-a",businessContext:{rows:[{label:"Production"}]}}}};
 const good=JSON.stringify({schema:"clara.production.proposal.v1",project_id:"project-a",preparation_id:"prep-a",
   rows:[{section:"tasks",label:"Verify resource",value:"Resource to confirm",notes:"Rider"}]});
 const success=routeHarness(false,undefined,false,undefined,async()=>({content:good,
   generation:{status:"completed",recoverable:false}}));
 let persisted:unknown;
 const receipt=await success.execute({product:success.products.get("clara-live")!,body,
   correlationId:"a".repeat(32),jobId:"b".repeat(64),progress:async()=>{},
   persist:async(data)=>{persisted=data;},persistFailure:async()=>{throw Error("Valid handoff must complete");}});
 assert.equal(receipt.status,200);
 assert.equal((await receipt.json()).data.response,good);
 assert.equal((persisted as {response:string}).response,good);
 for(const fragment of ["PRIVATE_PROSE_NO_ROWS",JSON.stringify({schema:"clara.production.proposal.v1",
    project_id:"another-project",preparation_id:"prep-a",rows:[{section:"tasks",label:"Incorrect scope",value:"No"}]})]){
   const failedRoute=routeHarness(false,undefined,false,undefined,async()=>({content:fragment,
     generation:{status:"completed",recoverable:false}}));
   let stored:unknown;let category:string|undefined;
   const failed=await failedRoute.execute({product:failedRoute.products.get("clara-live")!,body,
     correlationId:"c".repeat(32),jobId:"d".repeat(64),progress:async()=>{},
     persist:async()=>{throw Error("Unusable handoff must not complete");},
     persistFailure:async(c,session)=>{category=c;stored=session;}});
   assert.equal(failed.status,500);
   const payload=await failed.json();
   assert.equal(payload.code,"CORE_EVENT_PROCESSING_FAILED");
   assert.equal(payload.failureCategory,"invalid_structure");
   assert.equal(category,"invalid_structure");
   assert.equal(payload.data?.sessionId,"session-a");
   assert.equal(payload.data?.response,undefined);
   assert.equal(payload.data?.generation?.status,"failed");
   assert.doesNotMatch(JSON.stringify(payload),/PRIVATE_PROSE_NO_ROWS|another-project/);
   const conversation=(stored as {conversation:{content:string;generation?:{status:string}}[]}).conversation;
   assert.equal(conversation.length,2);
   assert.equal(conversation[0].content,body.message);
   assert.equal(conversation[1].generation?.status,"failed");
   assert.doesNotMatch(conversation[1].content,/PRIVATE_PROSE_NO_ROWS|another-project/);
   assert.equal(failedRoute.received.length,1,"Only one Core invocation, no replay");
 }
 const scopeMismatch=routeHarness();
 const invalid=await scopeMismatch.execute({product:scopeMismatch.products.get("clara-live")!,
   body:{...body,context:{...body.context,live:{adviceOnly:true,preparationId:"prep-other"}}},
   correlationId:"e".repeat(32),jobId:"f".repeat(64),progress:async()=>{},
   persist:async()=>{throw Error("No persistence on invalid preparation");}});
 assert.equal(invalid.status,400);
 assert.equal(scopeMismatch.received.length,0,"Scope mismatch rejected before dispatch");
});

test("P0-C: provider adapter enforces conversational ceiling and timeout without changing other profiles",async()=>{
 const calls:Record<string,unknown>[]=[],settings:Record<string,unknown>[]=[];
 class APIError extends Error{};class APIConnectionError extends Error{};class APIConnectionTimeoutError extends APIConnectionError{};
 class Client {
  static APIError=APIError;static APIConnectionError=APIConnectionError;static APIConnectionTimeoutError=APIConnectionTimeoutError;
  constructor(options:Record<string,unknown>){settings.push(options);}
  responses={create:async(input:Record<string,unknown>)=>{calls.push(input);return {output:[],output_text:"Partial",status:"incomplete",incomplete_details:{reason:"max_output_tokens"},usage:{output_tokens:input.max_output_tokens}};}};
 }
 const {OpenAIResponsesEngine:Engine}=moduleFrom("src/lib/connectors/internal/openai/responses/openai-responses-engine.ts",{openai:{default:Client},"@/lib/recette/external-execution-guard":{assertRecetteExternalExecutionBlocked:()=>{}}}) as {OpenAIResponsesEngine:typeof OpenAIResponsesEngine};
 const engine=new Engine();const response=await engine.generate({prompt:"Synthetic",maxTokens:100000,outputProfile:"conversation"});
 assert.equal(calls[0].max_output_tokens,3200);assert.equal(settings[0].timeout,60000);assert.equal(settings[0].maxRetries,0);assert.equal(response.finishReason,"incomplete");
 await engine.generate({prompt:"Synthetic",maxTokens:100000});assert.equal(calls[1].max_output_tokens,2000);assert.equal(settings[1].timeout,undefined);
 await engine.generate({prompt:"Synthetic",maxTokens:100000,outputProfile:"document_analysis"});assert.equal(calls[2].max_output_tokens,6000);
 await engine.generate({prompt:"Synthetic",maxTokens:100000,outputProfile:"live_production"});assert.equal(calls[3].max_output_tokens,5200);assert.equal(settings[3].timeout,60000);assert.equal(settings[3].maxRetries,0);
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


test("P0 Documents folder selection preserves explicit approval without blocking the browser",()=>{
 const ui=readFileSync("src/components/documents/NativeDocumentDailyPanel.tsx","utf8");
 assert.doesNotMatch(ui,/window\.confirm\s*\(/);
 assert.match(ui,/role="dialog" aria-modal="true"/);
 assert.match(ui,/if\(!folder\|\|busy\|\|!writable\)return/);
 assert.match(ui,/nativePost\('inspect',\{kind:'folder',resourceId:folder.id\}\)/);
 assert.match(ui,/nativePost\('bind',\{kind:'folder',resourceId:folder.id,version:inspect.resource.version\}\)/);
 assert.match(ui,/nativePost\('select',\{kind:'folder',resourceId:folder.id\}\)/);
 assert.match(ui,/refreshed.capabilities.selectedFolderId!==folder.id/);
 assert.match(ui,/!refreshed.resources.some\(resource=>resource.kind==='folder'&&resource.id===folder.id\)/);
 assert.match(ui,/disabled=\{busy\|\|!writable\}/);
 for(const locale of ["fr","en","es","de","it"]){
  const messages=JSON.parse(readFileSync(`src/i18n/messages/${locale}/index.json`,"utf8")).documents as Record<string,string>;
  for(const key of ["workspaceConfirmFolder","workspaceCancelFolder","workspaceFolderChecking","workspaceFolderReady","workspaceSearchFolder"])
   assert.ok(messages[key]?.trim(),`${locale}:${key}`);
 }
});

test("P0 Agenda reuses durable scoped calendars without session selection or automatic writes",()=>{
 const parser=readFileSync("src/lib/brain/calendar-read-intent.ts","utf8");
 const source=readFileSync("src/lib/brain/brain-source-registry.ts","utf8");
 const work=readFileSync("src/lib/native/google-work.ts","utf8");
 assert.match(parser,/chooseAuthorizedCalendar/);
 assert.match(parser,/matchesAuthorizedCalendarName/);
 assert.match(source,/nativeGoogleCommand\('list'\)/);
 assert.match(source,/googleWorkCommand\('resources',\{connectionId\}\)/);
 assert.match(source,/googleWorkCommand\('resource',\{connectionId,bindingId/);
 assert.match(source,/chooseAuthorizedCalendar\(candidates,intent.expectedName/);
 assert.match(source,/eventsForBoundCalendar\(calendarId,undefined,timeMin,timeMax\)/);
 assert.match(source,/current.revision!==proof.revision/);
 assert.match(work,/await this.bound\(id,'calendar'\);await this.calendar\(id\);/);
 assert.match(work,/return this.eventsForBoundCalendar\(id,pageToken,timeMin,timeMax\)/);
 assert.doesNotMatch(source,/native\.session\.googleCalendarId\s*=/);
});
