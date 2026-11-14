import {RegistryError} from '@/lib/canonical/registry';
import {nativeContext} from './scoped-context';
import {nativeMakeReadAuthority} from './make-read-authority';
import {executeAuthorizedNativeMakeRead,type MakeReadCapability} from './make-read-handoff';
import {scopedMakeReadCredentialStore,validateMakeCloneRuntime} from './make-scoped-credentials';
import {ConnectionResolver} from '@/lib/connections/connection-resolver';
import {ConnectionStatus,type Connection} from '@/lib/connections/connection';
import type {ConnectionRepository} from '@/lib/connections/connection-repository';
import {MakeConnectorAdapter} from '@/lib/connectors/make/adapter';
import {MAKE_CAPABILITIES} from '@/lib/connectors/make/definition';
import type {MakeFetch} from '@/lib/connectors/make/client';

const CONNECTION_ID='make-read-fixture-249-20261106';
const WORKSPACE_ID='melodie-digital';
const SCENARIO_KEY='find-drive-document';

/**
 * Clone-only native READ adapter. Never calls the generic Make executor that
 * opens clara_connections/credentials through global table-level permissions.
 * This method is not registered as a public HTTP route or implicit Brain tool.
 */
export function makeCloneScopedReadCapability(fetcher?:MakeFetch):MakeReadCapability{
 return {async execute(capabilityId,workspaceId,request){
  if(capabilityId!==MAKE_CAPABILITIES.SCENARIO_EXECUTE||
     workspaceId!==WORKSPACE_ID||
     !request||typeof request!=='object'||Array.isArray(request))
    throw new RegistryError(403,'NATIVE_MAKE_READ_ONLY');
  const value=request as {scenarioKey?:unknown;payload?:unknown};
  if(value.scenarioKey!==SCENARIO_KEY||!value.payload||typeof value.payload!=='object'||Array.isArray(value.payload))
    throw new RegistryError(403,'NATIVE_MAKE_READ_ONLY');
  const ctx=nativeContext();
  if(!ctx||ctx.scope.workspaceId!==WORKSPACE_ID)
    throw new RegistryError(403,'NATIVE_MAKE_SCOPE_DENIED');
  const grant=await nativeMakeReadAuthority.authorize({
   workspaceId:ctx.scope.workspaceId,clientId:ctx.scope.clientId,
   projectId:ctx.scope.projectId,userId:ctx.userId,scenarioKey:SCENARIO_KEY,
  });
  if(!grant||grant.connectionId!==CONNECTION_ID)
    throw new RegistryError(403,'NATIVE_MAKE_AUTHORITY_REQUIRED');

  const repository:ConnectionRepository={
   async findById(id):Promise<Connection|null>{
    if(id!==CONNECTION_ID)return null;
    // The native SQL proof has already validated status ACTIVE and
    // scenario-scoped authorization at the time of this call.
    const fresh=await nativeMakeReadAuthority.authorize({
     workspaceId:ctx.scope.workspaceId,clientId:ctx.scope.clientId,
     projectId:ctx.scope.projectId,userId:ctx.userId,scenarioKey:SCENARIO_KEY,
    });
    if(!fresh||fresh.connectionId!==grant.connectionId||fresh.revision!==grant.revision)return null;
    const now=new Date();
    return {id:CONNECTION_ID,workspaceId:WORKSPACE_ID,provider:'make',
      status:ConnectionStatus.ACTIVE,scopes:['make:scenario:'+SCENARIO_KEY],
      createdAt:now,updatedAt:now};
   },
   async findByWorkspaceAndProvider(){throw new RegistryError(403,'NATIVE_MAKE_EXPLICIT_CONNECTION_REQUIRED');},
   async save(){throw new RegistryError(403,'NATIVE_MAKE_WRITE_DENIED');},
   async updateStatus(){throw new RegistryError(403,'NATIVE_MAKE_WRITE_DENIED');},
  };
  const store=scopedMakeReadCredentialStore(CONNECTION_ID,SCENARIO_KEY);
  const adapter=new MakeConnectorAdapter(new ConnectionResolver(repository,store),fetcher);
  const response=await adapter.execute(CONNECTION_ID,{capability:MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    input:{scenarioKey:SCENARIO_KEY,payload:value.payload as Record<string,unknown>}});
  return {
   capabilityId,success:true,provider:'make',connectionId:CONNECTION_ID,
   status:'completed',data:response.data,
  };
 }};
}

/** Requires native AsyncLocalStorage scope established by withNativeScope. */
export async function executeCloneNativeMakeDriveRead(query:string){
 if(!validateMakeCloneRuntime())
   throw new RegistryError(403,'NATIVE_MAKE_CLONE_RUNTIME_DENIED');
 if(typeof query!=='string'||!query.trim()||query.length>200)
   throw new RegistryError(400,'NATIVE_MAKE_QUERY_INVALID');
 return executeAuthorizedNativeMakeRead(SCENARIO_KEY,{query},nativeMakeReadAuthority,makeCloneScopedReadCapability());
}
