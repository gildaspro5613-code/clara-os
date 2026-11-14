import test from 'node:test';
import assert from 'node:assert/strict';
import type {ConnectorDefinition} from '@/lib/connectors/core/connector';
import {ConnectorBuilderDirectory} from '@/lib/connectors/core/connector-builder-directory';
import {executeScopedConnectorRead,executeNativeConnectorRead,NativeConnectorReadDenied,
 type NativeConnectorReadAuthority,type NativeConnectorReadExecutor,type NativeConnectorReadAudit,
 type NativeConnectorReadProof} from '@/lib/connectors/core/native-connector-read-gateway';

const directory=new ConnectorBuilderDirectory();
const scope={userId:'user-a',workspaceId:'company-a',
 clientId:'client-a',projectId:'project-a',sessionId:'native:session-a'};
const key='github.repository.read';
const proof:NativeConnectorReadProof={...scope,provider:'github',
 capabilityId:key,connectionId:'connection-a',revision:1,catalogRevision:1};
const denied=(code:NativeConnectorReadDenied['code'])=>
 (error:unknown)=>error instanceof NativeConnectorReadDenied&&error.code===code;
const events:Array<{phase:string;reason?:string}>=[];
const audit:NativeConnectorReadAudit={async record(event){events.push(event);}};
const capabilityResponse={provider:'github',capabilityId:key,
 connectionId:'connection-a',status:'completed' as const,data:{value:'test data'}};
const authorize:NativeConnectorReadAuthority={async authorize(){return proof;}};
const execute:NativeConnectorReadExecutor={async execute(){return capabilityResponse;}};

test('Builder reuses declared capabilities; existence is not certification',()=>{
 assert.equal(directory.findRead('github.repository.read')?.provider,'github');
 assert.equal(directory.findRead('brevo.list.read')?.provider,'brevo');
 assert.equal(directory.findRead('make.scenario.execute'),undefined);
 assert.equal(directory.findRead('brevo.email.send'),undefined);
 assert.equal(directory.getCapability('stripe.payment.read'),undefined,
  'Not in the central CapabilityRegistry; do not auto-publish');
 assert.equal(directory.getProvider('stripe')?.id,'stripe');
 assert.equal(directory.getProvider('make')?.authentication,'webhook');
});

test('Builder prevents duplicate, unknown and malformed provider declarations',()=>{
 const definition:ConnectorDefinition={id:'newtool',name:'New Tool',version:'1.0.0',
  authentication:{type:'api_key',credentialReference:'connectionId'},
  capabilities:[{id:'newtool.data.read',operationType:'READ',description:'Read'}]};
 const known={has:()=>true};
 assert.equal(new ConnectorBuilderDirectory([definition],known).findRead('newtool.data.read')?.provider,'newtool');
 assert.throws(()=>new ConnectorBuilderDirectory([definition,definition],known));
 assert.throws(()=>new ConnectorBuilderDirectory([{...definition,
  capabilities:[...definition.capabilities,...definition.capabilities]}],known));
 assert.throws(()=>new ConnectorBuilderDirectory([{...definition,id:'__proto__'}],known));
 assert.throws(()=>new ConnectorBuilderDirectory([{...definition,
  capabilities:[{...definition.capabilities[0],id:'other.data.read'}]}],known));
});

test('validated native READ is bounded and revalidates the same grant revision',async()=>{
 let checks=0,calls=0;events.length=0;
 const result=await executeScopedConnectorRead(scope,key,{owner:'acme',repo:'example'},
  directory,{async authorize(req){checks++;assert.deepEqual(req,{scope,provider:'github',capabilityId:key});return proof;}},
  {async execute(req){calls++;assert.deepEqual(req,{
   workspaceId:'company-a',connectionId:'connection-a',provider:'github',
   capabilityId:key,input:{owner:'acme',repo:'example'},
  });return capabilityResponse;}},audit);
 assert.equal(result.available,true);
 assert.equal(result.untrusted,true);
 assert.equal(result.source,'github');
 assert.equal(checks,2);assert.equal(calls,1);
 assert.deepEqual(events.map(e=>e.phase),['REQUESTED','SUCCEEDED']);
 assert.match(result.summary,/untrusted/i);
});

test('no native authority means zero provider calls',async()=>{
 let calls=0;events.length=0;
 await assert.rejects(executeScopedConnectorRead(scope,key,{},directory,
  {async authorize(){return null;}},{async execute(){calls++;return capabilityResponse;}},audit),
  denied('CONNECTOR_READ_AUTHORITY_REQUIRED'));
 assert.equal(calls,0);
 assert.deepEqual(events.map(e=>e.phase),['DENIED']);
});

test('proof can never move to another user, company, client, project or provider',async()=>{
 for(const mismatch of [{userId:'different'},{workspaceId:'other'},
  {clientId:'other'},{projectId:'other'},{provider:'make'},
  {connectionId:''},{revision:0},{catalogRevision:0}]){
  let calls=0;
  await assert.rejects(executeScopedConnectorRead(scope,key,{},directory,
   {async authorize(){return {...proof,...mismatch};}},
   {async execute(){calls++;return capabilityResponse;}},audit),
   denied('CONNECTOR_READ_AUTHORITY_REQUIRED'));
  assert.equal(calls,0);
 }
});

test('WRITE/SEND, unknown capability, unsafe argument or identity spoofing never reach provider',async()=>{
 let called=0;
 const auth:NativeConnectorReadAuthority={async authorize(){called++;return proof;}};
 const handler:NativeConnectorReadExecutor={async execute(){called++;return capabilityResponse;}};
 for(const cap of ['make.scenario.execute','brevo.email.send','stripe.customer.upsert','unknown.run']){
  await assert.rejects(executeScopedConnectorRead(scope,cap,{},directory,auth,handler,audit),
   denied('CONNECTOR_READ_NOT_DECLARED'));
 }
 for(const input of [{token:'raw-secret'}, {userId:'someone-else'},
   {connectionId:'override'},JSON.parse('{"__proto__":{"polluted":true}}'),
   {deep:{apiKey:'raw-secret'}}, {big:'x'.repeat(5000)}]){
  await assert.rejects(executeScopedConnectorRead(scope,key,input,directory,auth,handler,audit),
   denied('CONNECTOR_READ_INPUT_INVALID'));
 }
 assert.equal(called,0);
});

test('revocation while supplier is running discards its response',async()=>{
 let release!:()=>void,start!:()=>void,revoked=false,checks=0;
 const pending=new Promise<void>(r=>{release=r;});
 const running=new Promise<void>(r=>{start=r;});
 const promise=executeScopedConnectorRead(scope,key,{},directory,
  {async authorize(){checks++;return revoked?null:proof;}},
  {async execute(){start();await pending;return capabilityResponse;}},audit);
 await running;revoked=true;release();
 await assert.rejects(promise,denied('CONNECTOR_READ_AUTHORITY_REVOKED'));
 assert.equal(checks,2);
});

test('incomplete or unrelated supplier receipts are never certified as READ',async()=>{
 for(const different of [{status:'pending' as const},
   {status:'failed' as const},{provider:'other'},{connectionId:'connection-b'},
   {capabilityId:'github.issue.read'},{data:{text:'x'.repeat(17000)}}]){
  await assert.rejects(executeScopedConnectorRead(scope,key,{},directory,
   authorize,{async execute(){return {...capabilityResponse,...different};}},audit),
   denied('CONNECTOR_READ_RESULT_DENIED'));
 }
});

test('audit must succeed before any provider call',async()=>{
 let calls=0;
 await assert.rejects(executeScopedConnectorRead(scope,key,{},directory,authorize,
  {async execute(){calls++;return capabilityResponse;}},
  {async record(){throw new Error('audit unavailable');}}));
 assert.equal(calls,0);
});

test('real native entry refuses when no authenticated Clara context exists',async()=>{
 await assert.rejects(executeNativeConnectorRead(key,{},directory,authorize,execute,audit),
  denied('NATIVE_SCOPE_REQUIRED'));
});

test('native model-tool gateway refuses unsupported commands, forged JSON and no session',async()=>{
 const {executeNativeBuilderToolCall}=await import('@/lib/connectors/core/native-connector-builder-tool');
 let calls=0;
 const deps={directory,authorize,audit,executor:{async execute(){calls++;return capabilityResponse;}}};
 const unsupported=await executeNativeBuilderToolCall({
  callId:'c1',name:'make.scenario.execute',arguments:'{}',
 },{...deps,authority:authorize});
 assert.equal(unsupported.available,false);
 assert.equal(unsupported.code,'CONNECTOR_NOT_AVAILABLE');
 const malformed=await executeNativeBuilderToolCall({
  callId:'c2',name:'github.repository.read',arguments:'{not valid}',
 },{...deps,authority:authorize});
 assert.equal(malformed.available,false);
 assert.equal(malformed.code,'CONNECTOR_INPUT_INVALID');
 const noContext=await executeNativeBuilderToolCall({
  callId:'c3',name:'github.repository.read',arguments:'{"owner":"acme","repo":"fixture"}',
 },{...deps,authority:authorize});
 assert.equal(noContext.available,false);
 assert.equal(noContext.code,'CONNECTOR_READ_UNAVAILABLE');
 assert.equal(calls,0);
});
