import test from 'node:test';
import assert from 'node:assert/strict';
import {CredentialStore,type CredentialPersistence} from '@/lib/connections/credential-store';
import {RegistryError} from '@/lib/canonical/registry';
import {nativeBuilderAdmin} from '@/lib/connectors/core/native-connector-builder-admin';
import {ConnectorBuilderDirectory} from '@/lib/connectors/core/connector-builder-directory';
import {executeScopedConnectorRead,NativeConnectorReadDenied} from '@/lib/connectors/core/native-connector-read-gateway';
import {authorizeMakeCalendarResource,executeMakeCalendarRead,validateMakeCalendarBinding} from '@/lib/connectors/make/native-calendar-read';
import {MAKE_CALENDAR_READS} from '@/lib/connectors/make/native-calendar-read-contract';
import type {MakeWebhookCredentials} from '@/lib/connectors/make/types';
import type {NativeGoogleProof} from '@/lib/native/google-authority';
import {calendarBinding,calendarCredentials,calendarInput} from './helpers/make-calendar-fixture';

// All values and encryption keys are synthetic and remain inside this test process.
// These tests exercise existing refusal paths, NOT an activation/merge implementation.
const connectionId='make-fixture';
const scope={userId:'user-a',workspaceId:'workspace-a',clientId:'client-a',projectId:'project-a',sessionId:'native:fixture'};
async function preservedCredentials(includeCalendar:boolean){
 let encrypted:string|null=null,loads=0,saves=0;
 const persistence:CredentialPersistence={
  async load(){loads++;return encrypted;},
  async save(_id,value){saves++;encrypted=value;},
 };
 const store=new CredentialStore(persistence,Buffer.alloc(32,17));
 const initial={
  ...calendarCredentials,
  ...(includeCalendar?{}:{calendarReadBinding:undefined}),
  scenarios:{...(includeCalendar?calendarCredentials.scenarios:{}),
   'find-drive-document':{transport:'api' as const,scenarioId:7295042},
   'other-existing':{transport:'api' as const,scenarioId:123},
  },
  futureField:{preserve:true},
 };
 await store.set(connectionId,initial);
 const snapshot=encrypted,plainSnapshot=JSON.stringify(initial);
 return {
  store,counts:()=>({loads,saves}),
  async assertIntact(){
   assert.ok(encrypted===snapshot,'Encrypted fixture must remain byte-identical after refusal');
   assert.equal(saves,1,'Only the initial fixture setup may save credentials');
   const after=await store.get(connectionId);
   // Boolean assertions deliberately avoid printing credential contents on failure.
   assert.ok(JSON.stringify(after)===plainSnapshot,'API config, Drive and unknown fields must remain unchanged');
  },
 };
}
const denied=(e:unknown)=>e instanceof RegistryError&&e.code==='CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED';

test('unconfigured Calendar binding refuses without mutating existing encrypted Drive/API credentials',async()=>{
 for(const cap of MAKE_CALENDAR_READS){
  const fixture=await preservedCredentials(false);let checks=0,gets=0,runs=0;
  const credentials=await fixture.store.get<MakeWebhookCredentials>(connectionId);
  assert.ok(credentials);
  await assert.rejects(executeMakeCalendarRead(cap.capabilityId,scope.workspaceId,calendarInput,credentials,{
   async authorize(){checks++;throw Error('No authority work for a missing binding');},
   async invoke(){runs++;throw Error('No supplier execution');},
   fetcher:async()=>{gets++;throw Error('No supplier metadata');},
  }),denied);
  assert.equal(checks+gets+runs,0);
  await fixture.assertIntact();
 }
});

test('wrong native user, Google subject, owner or workspace refuses before supplier access and preserves ciphertext',async()=>{
 const proof:NativeGoogleProof={connectionId:calendarBinding.googleConnectionId,userId:scope.userId,ownerUserId:scope.userId,issuer:'https://accounts.google.com',subject:calendarBinding.googleSubject,revision:1,connection:{workspace_id:scope.workspaceId,status:'ACTIVE'}};
 const selected={googleConnectionId:calendarBinding.googleConnectionId,googleCalendarId:calendarBinding.calendarId};
 for(const cap of MAKE_CALENDAR_READS){
  for(const mismatch of [{userId:'other'},{ownerUserId:'other'},{subject:'other'},{issuer:'https://other.invalid'},{connection:{workspace_id:'other',status:'ACTIVE'}}]){
   const fixture=await preservedCredentials(true);let resourceCalls=0,gets=0,runs=0;
   const credentials=await fixture.store.get<MakeWebhookCredentials>(connectionId);
   assert.ok(credentials);
   await assert.rejects(executeMakeCalendarRead(cap.capabilityId,scope.workspaceId,calendarInput,credentials,{
    authorize:binding=>authorizeMakeCalendarResource(scope,scope.userId,selected,binding,{
     async authority(){return {...proof,...mismatch};},
     async command(){resourceCalls++;throw Error('No resource access after identity mismatch');},
    }),
    async invoke(){runs++;throw Error('No supplier execution');},
    fetcher:async()=>{gets++;throw Error('No supplier metadata');},
   }),denied);
   assert.equal(resourceCalls+gets+runs,0);
   await fixture.assertIntact();
  }
 }
});

test('missing native Calendar grant refuses before loading credentials and leaves all encrypted fields intact',async()=>{
 for(const cap of MAKE_CALENDAR_READS){
  const fixture=await preservedCredentials(true),phases:string[]=[];let executes=0;
  await assert.rejects(executeScopedConnectorRead(scope,cap.capabilityId,calendarInput,new ConnectorBuilderDirectory(),
   {async authorize(){return null;}},
   {async execute(){executes++;await fixture.store.get(connectionId);throw Error('No executor without native grant');}},
   {async record(event){phases.push(event.phase);}}),
  e=>e instanceof NativeConnectorReadDenied&&e.code==='CONNECTOR_READ_AUTHORITY_REQUIRED');
  assert.equal(executes,0);assert.equal(fixture.counts().loads,0);
  assert.deepEqual(phases,['DENIED']);
  await fixture.assertIntact();
 }
});

test('a healthy Make connection ID or editable account label does not constitute a complete Calendar binding',()=>{
 for(const value of [
  {makeConnectionId:7999280},
  {makeConnectionId:7999280,status:'ok',label:'Synthetic Google account label'},
  {...calendarBinding,googleSubject:undefined},
 ])assert.throws(()=>validateMakeCalendarBinding(value),denied);
 // This does NOT certify the Make OAuth subject: the existing full binding checks
 // only its shape and the separate native identity. That is the documented blocker.
});


test('existing native administration refuses grant/revoke without authenticated writable scope and preserves credentials',async()=>{
 const fixture=await preservedCredentials(true),admin=nativeBuilderAdmin(new ConnectorBuilderDirectory());
 for(const cap of MAKE_CALENDAR_READS){
  for(const operation of ['grant','revoke'] as const){
   await assert.rejects(admin(operation,{connectionId,ownerUserId:scope.userId,capabilityId:cap.capabilityId,reason:'Synthetic explicit review',approved:true}),
    e=>e instanceof RegistryError&&e.code==='CONNECTOR_BUILDER_APPROVAL_SCOPE_REQUIRED');
  }
 }
 assert.equal(fixture.counts().loads,0);
 await fixture.assertIntact();
});
