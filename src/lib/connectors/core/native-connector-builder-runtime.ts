import {RegistryError} from '@/lib/canonical/registry';
import {nativeContext} from '@/lib/native/scoped-context';
import type {ConnectionRepository} from '@/lib/connections/connection-repository';
import {ConnectionStatus,type Connection} from '@/lib/connections/connection';
import {CredentialStore,type CredentialPersistence} from '@/lib/connections/credential-store';
import {ConnectionResolver} from '@/lib/connections/connection-resolver';
import type {
 NativeConnectorReadAuthority,NativeConnectorReadAudit,NativeConnectorReadExecutor,
 NativeConnectorReadProof,NativeConnectorReadRequest,
} from './native-connector-read-gateway';
import {ConnectorBuilderDirectory} from './connector-builder-directory';

function scopedContext(){
 const ctx=nativeContext();
 if(!ctx)throw new RegistryError(403,'CONNECTOR_BUILDER_AUTH_REQUIRED');
 return ctx;
}
function validProof(
 raw:unknown,request:NativeConnectorReadRequest,
):NativeConnectorReadProof|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const r=raw as Record<string,unknown>,s=request.scope;
 if(r.userId!==s.userId||r.workspaceId!==s.workspaceId||
  r.clientId!==s.clientId||r.projectId!==s.projectId||
  r.provider!==request.provider||r.capabilityId!==request.capabilityId||
  typeof r.connectionId!=='string'||!/^[a-zA-Z0-9._:-]{1,160}$/.test(r.connectionId))return null;
 const revision=Number(r.revision),catalogRevision=Number(r.catalogRevision);
 if(!Number.isSafeInteger(revision)||revision<=0||
  !Number.isSafeInteger(catalogRevision)||catalogRevision<=0)return null;
 return {...s,provider:request.provider,capabilityId:request.capabilityId,
  connectionId:r.connectionId,revision,catalogRevision};
}
/** Generic SQL resolver uses the existing signed Clara session. It neither
 * creates a new token nor accepts user/connection IDs from a chat message.
 */
export const nativeBuilderReadAuthority:NativeConnectorReadAuthority={
 async authorize(request){
  const ctx=nativeContext();
  if(!ctx||ctx.userId!==request.scope.userId||
    ctx.scope.workspaceId!==request.scope.workspaceId||
    ctx.scope.clientId!==request.scope.clientId||
    ctx.scope.projectId!==request.scope.projectId||
    ctx.scope.sessionId!==request.scope.sessionId)return null;
  try{
   const s=ctx.scope;
   const rows=await ctx.query`
    SELECT clara_connector_builder.native_read(
     ${s.digest},${s.workspaceId},${s.clientId},${s.projectId},
     ${s.sessionId},${request.capabilityId},'authorize'
    ) AS proof
   `;
   return validProof((rows[0] as {proof?:unknown}|undefined)?.proof,request);
  }catch{return null;}
 }
};

/** SQL audit is authenticated, append-only and cannot be accessed directly
 * by the runtime DB role. Failure blocks a provider call.
 */
export const nativeBuilderReadAudit:NativeConnectorReadAudit={
 async record(event){
  const ctx=scopedContext(),s=ctx.scope;
  if(ctx.userId!==event.userId||s.workspaceId!==event.workspaceId||
   s.clientId!==event.clientId||s.projectId!==event.projectId)
   throw new RegistryError(403,'CONNECTOR_BUILDER_AUDIT_SCOPE_DENIED');
  const reason=event.reason?.slice(0,240)??null;
  await ctx.query`
   SELECT clara_connector_builder.native_read_audit(
    ${s.digest},${s.workspaceId},${s.clientId},${s.projectId},
    ${s.sessionId},${event.provider},${event.capabilityId},
    ${event.phase},${event.connectionId??null},${reason}
   )
  `;
 }
};

function requestMatchesNative(request:NativeConnectorReadRequest):boolean{
 const ctx=nativeContext(),s=request.scope;
 return !!ctx&&ctx.userId===s.userId&&ctx.scope.workspaceId===s.workspaceId&&
 ctx.scope.clientId===s.clientId&&ctx.scope.projectId===s.projectId&&
 ctx.scope.sessionId===s.sessionId;
}

function scopedConnection(
 request:NativeConnectorReadRequest,expected:NativeConnectorReadProof,
):ConnectionRepository{
 const authority=nativeBuilderReadAuthority;
 const requireFresh=async()=>{
  if(!requestMatchesNative(request))
   throw new RegistryError(403,'CONNECTOR_BUILDER_SCOPE_DENIED');
  const fresh=await authority.authorize(request);
  if(!fresh||fresh.connectionId!==expected.connectionId||
    fresh.revision!==expected.revision||
    fresh.catalogRevision!==expected.catalogRevision)
   throw new RegistryError(403,'CONNECTOR_BUILDER_AUTHORITY_REVOKED');
 };
 return {
  async findById(id):Promise<Connection|null>{
   if(id!==expected.connectionId)return null;
   await requireFresh();
   const now=new Date();
   // SQL proof guarantees the actual connection is ACTIVE and scoped.
   return {id,workspaceId:request.scope.workspaceId,
    provider:request.provider,status:ConnectionStatus.ACTIVE,
    scopes:[],createdAt:now,updatedAt:now};
  },
  async findByWorkspaceAndProvider(){throw new RegistryError(403,'CONNECTOR_BUILDER_EXPLICIT_CONNECTION_REQUIRED');},
  async save(){throw new RegistryError(403,'CONNECTOR_BUILDER_WRITE_DENIED');},
  async updateStatus(){throw new RegistryError(403,'CONNECTOR_BUILDER_WRITE_DENIED');},
 };
}

function scopedCredentials(
 request:NativeConnectorReadRequest,expected:NativeConnectorReadProof,
):CredentialStore{
 const persistence:CredentialPersistence={
  async load(id){
   const ctx=scopedContext(),s=ctx.scope;
   if(id!==expected.connectionId||!requestMatchesNative(request))
    throw new RegistryError(403,'CONNECTOR_BUILDER_SCOPE_DENIED');
   const rows=await ctx.query`
    SELECT clara_connector_builder.native_read(
     ${s.digest},${s.workspaceId},${s.clientId},${s.projectId},
     ${s.sessionId},${request.capabilityId},'credentials'
    ) AS proof
   `;
   const raw=(rows[0] as {proof?:unknown}|undefined)?.proof;
   const fresh=validProof(raw,request);
   if(!fresh||fresh.connectionId!==expected.connectionId||
      fresh.revision!==expected.revision||
      fresh.catalogRevision!==expected.catalogRevision)
    throw new RegistryError(403,'CONNECTOR_BUILDER_AUTHORITY_REVOKED');
   const ciphertext=(raw as Record<string,unknown>).encryptedPayload;
   if(typeof ciphertext!=='string'||ciphertext.length<90||ciphertext.length>12000)
    throw new RegistryError(403,'CONNECTOR_BUILDER_CREDENTIALS_DENIED');
   return ciphertext;
  },
  async save(){throw new RegistryError(403,'CONNECTOR_BUILDER_CREDENTIALS_WRITE_DENIED');},
 };
 // Retains the existing service-owned AES-GCM CredentialStore. There is no
 // second encryption format, and the ciphertext never reaches HTTP/Brain.
 return new CredentialStore(persistence);
}

/** Shared adapter execution. Provider-specific adapters are installed ONCE
 * in the platform; clients only create connections and native read grants.
 * SQL never accepts arbitrary endpoint URLs, code or user-supplied secrets.
 */
export function nativeBuilderReadExecutor(
 directory:ConnectorBuilderDirectory,
):NativeConnectorReadExecutor{
 return {async execute(request){
  const cap=directory.findRead(request.capabilityId);
  if(!cap||cap.provider!==request.provider)
   throw new RegistryError(403,'CONNECTOR_BUILDER_READ_ONLY');
  const ctx=scopedContext(),s=ctx.scope;
  if(request.workspaceId!==s.workspaceId)
   throw new RegistryError(403,'CONNECTOR_BUILDER_WORKSPACE_DENIED');
  const scope={userId:ctx.userId,workspaceId:s.workspaceId,
   clientId:s.clientId,projectId:s.projectId,sessionId:s.sessionId};
  const nativeRequest={scope,provider:request.provider,capabilityId:request.capabilityId};
  const proof=await nativeBuilderReadAuthority.authorize(nativeRequest);
  if(!proof||proof.connectionId!==request.connectionId)
   throw new RegistryError(403,'CONNECTOR_BUILDER_AUTHORITY_REQUIRED');
  const connection=new ConnectionResolver(
   scopedConnection(nativeRequest,proof),scopedCredentials(nativeRequest,proof),
  );
  let data:unknown;
  if(request.provider==='github'){
   const {GitHubConnectorAdapter}=await import('@/lib/connectors/github/adapter');
   const adapter=new GitHubConnectorAdapter(connection);
   const response=await adapter.execute(request.connectionId,{
    capability:request.capabilityId,
    input:request.input,
   } as unknown as Parameters<GitHubConnectorAdapter['execute']>[1],request.workspaceId);
   data=response.data;
  }else if(request.provider==='brevo'){
   const {BrevoConnectorAdapter}=await import('@/lib/connectors/brevo/adapter');
   const adapter=new BrevoConnectorAdapter(connection);
   const response=await adapter.execute(request.connectionId,{
    capability:request.capabilityId,
    input:request.input,
   } as unknown as Parameters<BrevoConnectorAdapter['execute']>[1]);
   if(!response.success||response.status!=='completed')
    throw new RegistryError(503,'CONNECTOR_BUILDER_PROVIDER_FAILED');
   data=response.data;
  }else if(request.provider==='make' &&
           request.capabilityId==='make.drive.find'){
   // The provider's generic EXECUTE endpoint is used only as an implementation
   // detail of this SINGLE catalog-reviewed READ scenario. Never permit a
   // model-controlled scenarioKey or arbitrary Make run, send or write.
   const keys=Object.keys(request.input);
   if(keys.length!==1||keys[0]!=='query'||
      typeof request.input.query!=='string'||
      !request.input.query.trim()||request.input.query.length>200)
    throw new RegistryError(400,'CONNECTOR_BUILDER_MAKE_QUERY_DENIED');
   const {MakeConnectorAdapter}=await import('@/lib/connectors/make/adapter');
   const {MAKE_CAPABILITIES}=await import('@/lib/connectors/make/definition');
   const adapter=new MakeConnectorAdapter(connection);
   const response=await adapter.execute(request.connectionId,{
     capability:MAKE_CAPABILITIES.SCENARIO_EXECUTE,
     input:{scenarioKey:'find-drive-document',payload:{query:request.input.query}},
   });
   const receipt=response.data;
   if(!receipt||typeof receipt!=='object'||!('ok' in receipt)||
      receipt.ok!==true||!('executionStatus' in receipt)||
      receipt.executionStatus!=='completed'||
      !('scenarioKey' in receipt)||receipt.scenarioKey!=='find-drive-document')
    throw new RegistryError(503,'CONNECTOR_BUILDER_MAKE_RECEIPT_DENIED');
   data=receipt.data;
  }else if(request.provider==='stripe'){
   const {StripeConnectorAdapter}=await import('@/lib/connectors/stripe/adapter');
   const adapter=new StripeConnectorAdapter(connection);
   const response=await adapter.execute(request.connectionId,{
    capability:request.capabilityId,
    input:request.input,
   } as unknown as Parameters<StripeConnectorAdapter['execute']>[1]);
   data=response.data;
  }else{
   // Make scenarios remain in their own certified, scenario-key-specific READ
   // authority until a generic Make READ descriptor is reviewed; never expose
   // its generic EXECUTE capability through this READ path.
   throw new RegistryError(403,'CONNECTOR_BUILDER_ADAPTER_NOT_CERTIFIED');
  }
  return {provider:request.provider,capabilityId:request.capabilityId,
   connectionId:request.connectionId,status:'completed',data};
 }};
}
