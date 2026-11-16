import test from 'node:test';
import assert from 'node:assert/strict';
import {RegistryError} from '@/lib/canonical/registry';
import {ConnectorBuilderDirectory} from '@/lib/connectors/core/connector-builder-directory';
import {executeScopedConnectorRead,NativeConnectorReadDenied,type NativeConnectorReadProof} from '@/lib/connectors/core/native-connector-read-gateway';
import {ConnectionResolver} from '@/lib/connections/connection-resolver';
import type {ConnectionRepository} from '@/lib/connections/connection-repository';
import type {CredentialStore} from '@/lib/connections/credential-store';
import {ConnectionStatus} from '@/lib/connections/connection';
import {MakeConnectorAdapter} from '@/lib/connectors/make/adapter';
import {MAKE_CAPABILITIES} from '@/lib/connectors/make/definition';
import {MAKE_CALENDAR_READS,makeCalendarReadFailureMessage} from '@/lib/connectors/make/native-calendar-read-contract';
import {authorizeMakeCalendarResource,executeMakeCalendarRead,validateMakeCalendarBinding} from '@/lib/connectors/make/native-calendar-read';
import type {NativeGoogleProof} from '@/lib/native/google-authority';
import {calendarBinding,calendarCredentials,calendarInput,calendarFixtureFetch,calendarResponse} from './helpers/make-calendar-fixture';

const scope={userId:'user-a',workspaceId:'workspace-a',clientId:'client-a',projectId:'project-a',sessionId:'session-a'};
const resourceProof={bindingId:'binding-a',googleRevision:3};
const nativeProof:NativeGoogleProof={connectionId:calendarBinding.googleConnectionId,userId:scope.userId,ownerUserId:scope.userId,issuer:'https://accounts.google.com',subject:calendarBinding.googleSubject,revision:3,connection:{workspace_id:scope.workspaceId,status:'ACTIVE'}};
const selected={googleConnectionId:calendarBinding.googleConnectionId,googleCalendarId:calendarBinding.calendarId};
const resource={bindingId:'binding-a',kind:'calendar',metadata:{id:calendarBinding.calendarId,connectionId:calendarBinding.googleConnectionId,subject:calendarBinding.googleSubject,issuer:nativeProof.issuer}};
const directory=new ConnectorBuilderDirectory();
const deny=(code:string)=>(e:unknown)=>e instanceof RegistryError&&e.code===code;

test('Make Calendar requires exact native user, selected calendar, subject and durable resource binding',async()=>{
 let calls=0;
 const deps={async authority(){return nativeProof;},async command(op:string){calls++;return op==='resources'?{resources:[resource]}:resource;}};
 assert.deepEqual(await authorizeMakeCalendarResource(scope,scope.userId,selected,calendarBinding,deps),resourceProof);
 assert.equal(calls,2);
 for(const altered of [{...selected,googleCalendarId:'foreign'},{...selected,googleConnectionId:'foreign'},{...selected,expectedCalendarName:'Other Calendar'},{}]){
  await assert.rejects(authorizeMakeCalendarResource(scope,scope.userId,altered,calendarBinding,deps),deny('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED'));
 }
 for(const changed of [{userId:'user-b'},{ownerUserId:'user-b'},{subject:'foreign'},{issuer:'https://evil.test'},{revision:0},{connection:{workspace_id:'foreign',status:'ACTIVE'}},{connection:{workspace_id:scope.workspaceId,status:'REVOKED'}}]){
  await assert.rejects(authorizeMakeCalendarResource(scope,scope.userId,selected,calendarBinding,{...deps,async authority(){return {...nativeProof,...changed};}}),deny('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED'));
 }
 for(const resources of [[],[resource,resource],[{...resource,kind:'document'}],[{...resource,metadata:{...resource.metadata,id:'foreign'}}]]){
  await assert.rejects(authorizeMakeCalendarResource(scope,scope.userId,selected,calendarBinding,{...deps,async command(){return {resources};}}));
 }
 await assert.rejects(authorizeMakeCalendarResource(scope,scope.userId,selected,calendarBinding,{...deps,async command(op){if(op==='resource')throw Error('revoked binding');return {resources:[resource]};}}));
 await assert.rejects(authorizeMakeCalendarResource(scope,scope.userId,selected,calendarBinding,{...deps,async command(op){return op==='resources'?{resources:[resource]}:{...resource,metadata:{...resource.metadata,subject:'foreign'}};}}));
 for(const binding of [undefined,{...calendarBinding,calendarId:'primary'},{...calendarBinding,makeConnectionId:0},{...calendarBinding,scenarioId:123}])assert.throws(()=>validateMakeCalendarBinding(binding));
});

test('real gateway and adapter execute only each pinned Calendar scenario using simulated Make API',async()=>{
 for(const cap of MAKE_CALENDAR_READS){
  const proof:NativeConnectorReadProof={...scope,provider:'make',capabilityId:cap.capabilityId,connectionId:'make-a',revision:2,catalogRevision:1};
  const verification=calendarFixtureFetch(cap),posted:Record<string,unknown>[]=[],phases:string[]=[];
  const fetcher:typeof fetch=async(url,init)=>{
   if(init?.method==='GET')return verification.fetcher(url,init);
   assert.equal(String(url),`https://eu1.make.com/api/v2/scenarios/${cap.scenarioId}/run`);
   assert.equal(init?.method,'POST');posted.push(JSON.parse(String(init?.body)));
   return new Response(JSON.stringify({status:1,outputs:calendarResponse(cap)}));
  };
  const repository={async findById(){return {id:'make-a',workspaceId:scope.workspaceId,provider:'make',status:ConnectionStatus.ACTIVE,scopes:[],createdAt:new Date(),updatedAt:new Date()};}} as unknown as ConnectionRepository;
  const store={async get(){return calendarCredentials;}} as unknown as CredentialStore;
  const adapter=new MakeConnectorAdapter(new ConnectionResolver(repository,store),fetcher);
  let revalidations=0;
  const result=await executeScopedConnectorRead(scope,cap.capabilityId,calendarInput,directory,
   {async authorize(){return proof;}},
   {async execute(request){
    const read=await executeMakeCalendarRead(request.capabilityId,request.workspaceId,calendarInput,calendarCredentials,{
     async authorize(){revalidations++;return resourceProof;},fetcher,
     async invoke(input){return (await adapter.execute(request.connectionId,{capability:MAKE_CAPABILITIES.SCENARIO_EXECUTE,input})).data;},
    });
    await read.revalidate();
    return {provider:'make',capabilityId:cap.capabilityId,connectionId:'make-a',status:'completed',data:read.data};
   }},
   {async record(e){phases.push(e.phase);}});
  assert.equal(result.available,true);assert.deepEqual(phases,['REQUESTED','SUCCEEDED']);assert.equal(posted.length,1);
  assert.deepEqual(posted[0],{responsive:true,data:{workspaceId:scope.workspaceId,start:calendarInput.start,end:calendarInput.end}});
  assert.equal(revalidations,4);assert.equal(verification.urls.length,3);
  assert.doesNotMatch(result.summary,/fixture-only-token|fixture-subject|google-fixture/);
 }
});

test('Calendar grant absent, wrong user/client/project/workspace, revoked or bad audit prevents supplier execution',async()=>{
 const cap=MAKE_CALENDAR_READS[0];let calls=0;
 const proof:NativeConnectorReadProof={...scope,provider:'make',capabilityId:cap.capabilityId,connectionId:'make-a',revision:1,catalogRevision:1};
 const executor={async execute(){calls++;throw Error('must not call');}};
 for(const grant of [null,{...proof,userId:'foreign'},{...proof,workspaceId:'foreign'},{...proof,clientId:'foreign'},{...proof,projectId:'foreign'},{...proof,revision:0}]){
  await assert.rejects(executeScopedConnectorRead(scope,cap.capabilityId,calendarInput,directory,{async authorize(){return grant;}},executor,{async record(){}}),e=>e instanceof NativeConnectorReadDenied);
 }
 await assert.rejects(executeScopedConnectorRead(scope,cap.capabilityId,calendarInput,directory,{async authorize(){return proof;}},executor,{async record(){throw Error('audit unavailable');}}));
 assert.equal(calls,0);
});

test('missing reviewed configuration and arbitrary scenarios are refused before Make GETs or POST',async()=>{
 const cap=MAKE_CALENDAR_READS[0];let calls=0;
 const deps={async authorize(){calls++;return resourceProof;},async invoke(){calls++;},fetcher:async()=>{calls++;throw Error('no network');}};
 for(const credentials of [{...calendarCredentials,calendarReadBinding:undefined},{...calendarCredentials,scenarios:{}},{...calendarCredentials,scenarios:{[cap.scenarioKey]:{transport:'api' as const,scenarioId:999}}},{...calendarCredentials,api:undefined}]){
  await assert.rejects(executeMakeCalendarRead(cap.capabilityId,scope.workspaceId,calendarInput,credentials,deps));
 }
 await assert.rejects(executeMakeCalendarRead('make.scenario.execute',scope.workspaceId,calendarInput,calendarCredentials,deps));
 assert.equal(calls,0);
});

test('resource revoked during verification, during run, or before final commit withholds result',async()=>{
 const cap=MAKE_CALENDAR_READS[0];
 for(const failAt of [1,2,3,4]){
  let checks=0,posts=0;
  const {fetcher}=calendarFixtureFetch(cap);
  try{
   const read=await executeMakeCalendarRead(cap.capabilityId,scope.workspaceId,calendarInput,calendarCredentials,{
    fetcher,async authorize(){checks++;return checks===failAt?{...resourceProof,googleRevision:99}:resourceProof;},
    async invoke(){posts++;return {ok:true,scenarioKey:cap.scenarioKey,status:200,executionStatus:'completed',data:calendarResponse(cap)};},
   });
   await read.revalidate();assert.fail('revocation must deny');
  }catch(e){assert.ok(e instanceof RegistryError);assert.equal(e.code,'CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');}
  assert.ok(posts<2,'no retry');if(failAt<=2)assert.equal(posts,0);
 }
});

test('empty outputs and provider errors are fixed, audited failures without retry or leaked details',async()=>{
 const cap=MAKE_CALENDAR_READS[1];
 for(const failure of ['empty','error','pending','foreign-scenario','bad-status'] as const){
  let posts=0;const events:Array<{phase:string;reason?:string}>=[];
  const proof:NativeConnectorReadProof={...scope,provider:'make',capabilityId:cap.capabilityId,connectionId:'make-a',revision:1,catalogRevision:1};
  await assert.rejects(executeScopedConnectorRead(scope,cap.capabilityId,calendarInput,directory,{async authorize(){return proof;}},
   {async execute(){
    const {fetcher}=calendarFixtureFetch(cap);
    await executeMakeCalendarRead(cap.capabilityId,scope.workspaceId,calendarInput,calendarCredentials,{fetcher,async authorize(){return resourceProof;},async invoke(){
     posts++;if(failure==='error')throw Error('private-token-provider-body');
     return {ok:true,status:failure==='bad-status'?503:200,executionStatus:failure==='pending'?'pending':'completed',scenarioKey:failure==='foreign-scenario'?'arbitrary':cap.scenarioKey,data:failure==='empty'?null:calendarResponse(cap)};
    }});throw Error('must fail');
   }},{async record(e){events.push(e);}}),e=>e instanceof NativeConnectorReadDenied&&Boolean(e.safeReason?.startsWith('CONNECTOR_BUILDER_MAKE_CALENDAR_')));
  assert.equal(posts,1);assert.deepEqual(events.map(e=>e.phase),['REQUESTED','FAILED']);assert.doesNotMatch(JSON.stringify(events),/private-token/);
  assert.ok(makeCalendarReadFailureMessage(events.at(-1)?.reason).length>30);
 }
});
