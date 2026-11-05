import test from 'node:test';
import assert from 'node:assert/strict';
import {CapabilityRegistry} from '@/lib/capabilities/capability-registry';
import {GitHubReadExecutor} from '@/lib/capabilities/github-read/executor';
import {GitHubConnectorDefinition,GITHUB_CAPABILITIES} from '@/lib/connectors/github/definition';
import {ConnectionResolver,ConnectionResolutionError} from '@/lib/connections/connection-resolver';
import {ConnectionStatus,type Connection} from '@/lib/connections/connection';
import type {ConnectionRepository} from '@/lib/connections/connection-repository';
import type {CredentialStore} from '@/lib/connections/credential-store';
import {ConnectorEngine} from '@/lib/connectors/core/connector-engine';
import type {ExecutableConnector} from '@/lib/connectors/core/connector';

/** Isolated READ reception of the already-shipped Connector Core.
 * No live provider calls, no persistent registry, no UI/Brain/Live changes.
 */
test('existing connector declaration is registered once as READ; WRITE is not exposed by READ registry',()=>{
 const registry=new CapabilityRegistry();
 const reads=GitHubConnectorDefinition.capabilities.filter(x=>x.operationType==='READ');
 assert.ok(reads.length>0);
 for(const declared of reads){
  const entry=registry.findById(declared.id);
  assert.ok(entry,'missing READ capability: '+declared.id);
  assert.equal(entry?.id,declared.id);
  assert.equal(registry.getAll().filter(x=>x.id===declared.id).length,1);
 }
 assert.equal(registry.has(GITHUB_CAPABILITIES.ISSUE_CREATE),false);
 assert.equal(registry.has(GITHUB_CAPABILITIES.PULL_REQUEST_MERGE),false);
});

test('existing connection resolver validates provider, connection state and credentials',async()=>{
 const connection:Connection={id:'read-only-connection',workspaceId:'isolated-workspace',provider:'github',status:ConnectionStatus.ACTIVE,scopes:[],createdAt:new Date(0),updatedAt:new Date(0)};
 const repository={findById:async()=>connection} as unknown as ConnectionRepository;
 let reads=0;
 const credentials={get:async()=>{reads++;return {accessToken:'fixture-only-never-network'};}} as unknown as CredentialStore;
 const resolver=new ConnectionResolver(repository,credentials);
 const resolved=await resolver.resolve<{accessToken:string}>('read-only-connection','github');
 assert.equal(resolved.connection.workspaceId,'isolated-workspace');
 assert.equal(reads,1);
 await assert.rejects(resolver.resolve('read-only-connection','google'),(e:unknown)=>e instanceof ConnectionResolutionError&&e.code==='CONNECTION_PROVIDER_MISMATCH');
 assert.equal(reads,1,'provider mismatch must never touch credentials');
 connection.status=ConnectionStatus.DISABLED;
 await assert.rejects(resolver.resolve('read-only-connection','github'),(e:unknown)=>e instanceof ConnectionResolutionError&&e.code==='CONNECTION_INACTIVE');
 assert.equal(reads,1);
});

test('existing READ executor dispatches only declared operations and refuses WRITE',async()=>{
 const events:string[]=[];
 const executor=new GitHubReadExecutor(()=>({
  async execute(connectionId,request,workspaceId){assert.equal(workspaceId,'isolated-workspace');events.push(request.capability);assert.equal(connectionId,'read-only-connection');return {provider:'github',capability:request.capability,data:{source:'isolated-read',ok:true}};}
 }));
 const success=await executor.execute(GITHUB_CAPABILITIES.REPOSITORY_READ,{connectionId:'read-only-connection',input:{owner:'fixture',repo:'fixture'}},'isolated-workspace');
 assert.equal(success.success,true);
 assert.deepEqual(success.data,{source:'isolated-read',ok:true});
 const denied=await executor.execute(GITHUB_CAPABILITIES.ISSUE_CREATE,{connectionId:'read-only-connection',input:{}},'isolated-workspace');
 assert.equal(denied.success,false);
 assert.equal(denied.error?.code,'UNSUPPORTED_CAPABILITY');
 const noConnection=await executor.execute(GITHUB_CAPABILITIES.REPOSITORY_READ,{input:{}},'isolated-workspace');
 assert.equal(noConnection.success,false);
 assert.equal(noConnection.error?.code,'CONNECTION_REQUIRED');
 const unscoped=await executor.execute(GITHUB_CAPABILITIES.REPOSITORY_READ,{connectionId:'read-only-connection',input:{} });
 assert.equal(unscoped.success,false);
 assert.equal(unscoped.error?.code,'WORKSPACE_REQUIRED');
 assert.deepEqual(events,[GITHUB_CAPABILITIES.REPOSITORY_READ]);
});

test('existing ConnectorEngine rejects disabled and undeclared capability before handler',async()=>{
 let calls=0;
 const connector:ExecutableConnector={
  id:'isolated-read',name:'Isolated READ Adapter',version:'1.0.0',
  context:{brain:{} as ExecutableConnector['context']['brain'],experiences:[],recommendations:[],configuration:{},createdAt:new Date(0)},
  capabilities:['fixture.resource.read'],enabled:false,
  async execute(event){calls++;return {success:true,capability:event.capability,data:{ok:true},completedAt:new Date()};}
 };
 const engine=new ConnectorEngine();
 const event={id:'fixture-event',capability:'fixture.resource.read',payload:{},source:'isolated-test',receivedAt:new Date(0)};
 assert.equal((await engine.execute(connector,event)).success,false);
 connector.enabled=true;
 assert.equal((await engine.execute(connector,{...event,capability:'fixture.resource.write'})).success,false);
 assert.equal(calls,0);
 const result=await engine.execute(connector,event);
 assert.equal(result.success,true);
 assert.equal(calls,1);
});
