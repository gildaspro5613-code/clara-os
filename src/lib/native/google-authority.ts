import {createHash} from 'node:crypto';
import {sql} from '@/lib/core/store/database';
import {databaseError,RegistryError,type RegistryQuery} from '@/lib/canonical/registry';
import {nativeContext} from './scoped-context';
import {CredentialStore,decryptCredentialPayload,type CredentialPersistence} from '@/lib/connections/credential-store';
import type {ConnectionRepository} from '@/lib/connections/connection-repository';
import type {Connection} from '@/lib/connections/connection';
export const googleProofHash=(v:string)=>createHash('sha256').update(v).digest('hex');
export function nativeGoogleCommands(query?:RegistryQuery){return async(operation:string,payload:Record<string,unknown>={})=>{
 const ctx=nativeContext();if(!ctx)throw new RegistryError(403,'NATIVE_GOOGLE_SCOPE_REQUIRED');const s=ctx.scope;const run=query??ctx.query??sql;
 try {const rows=await run`SELECT clara_native_google_command(${s.digest},${s.workspaceId},${s.clientId},${s.projectId},${s.sessionId},${operation},${JSON.stringify(payload)}::jsonb) AS data`;return (rows[0] as {data:Record<string,unknown>}).data;}catch(error){if((error as {code?:string}).code==='40001')throw new RegistryError(409,'NATIVE_DOCUMENT_REVISION_CONFLICT');databaseError(error);}
};}
export const nativeGoogleCommand=nativeGoogleCommands();
export interface NativeGoogleProof {connectionId:string;revision:number;issuer:string;subject:string;ownerUserId:string;userId:string;encryptedPayload?:string;connection:Record<string,unknown>}
export async function googleAuthority(connectionId:string){return await nativeGoogleCommand('authority',{connectionId}) as unknown as NativeGoogleProof;}
/** Uses the EXISTING AES-GCM CredentialStore. Each read/write repeats canonical
 * authority; a refresh prepared before revocation cannot overwrite credentials. */
export function scopedGoogleCredentialStore(connectionId:string,proof?:NativeGoogleProof,finish?:{stateHash:string;nonceHash:string;issuer:string;subject:string}){
 const persistence:CredentialPersistence={
  async load(id){if(id!==connectionId)throw new RegistryError(403,'NATIVE_GOOGLE_SCOPE_DENIED');const data=await nativeGoogleCommand(finish?'callback':'credentials',{connectionId,...finish});return typeof data.encryptedPayload==='string'?data.encryptedPayload:null;},
  async save(id,encryptedPayload){if(id!==connectionId)throw new RegistryError(403,'NATIVE_GOOGLE_SCOPE_DENIED');const tokens=decryptCredentialPayload<{scope?:string[]}>(encryptedPayload);await nativeGoogleCommand(finish?'finish':'refresh',{connectionId,encryptedPayload,revision:proof?.revision,...finish,...(tokens.scope?{grantedScopes:tokens.scope}:{})});},
 };
 return new CredentialStore(persistence);
}
/** No global repository initialization or workspace inference in a native frame. */
export function scopedGoogleRepository(connectionId:string,callback?:{stateHash:string;nonceHash:string}):ConnectionRepository{
 return {
  async findById(id){if(id!==connectionId)return null;const data=await nativeGoogleCommand(callback?'callback':'authority',{connectionId,...callback});const r=data.connection as Record<string,unknown>;return {id:String(r.id),workspaceId:String(r.workspace_id),provider:String(r.provider),status:r.status as Connection['status'],scopes:r.scopes as string[],createdAt:new Date(String(r.created_at)),updatedAt:new Date(String(r.updated_at))};},
  async findByWorkspaceAndProvider(){throw new RegistryError(403,'NATIVE_GOOGLE_EXPLICIT_CONNECTION_REQUIRED');},
  async save(){throw new RegistryError(403,'NATIVE_GOOGLE_WRITE_DENIED');},
  async updateStatus(){// OAuth completion updates status in the same SQL transaction as credentials.
   if(!callback)await nativeGoogleCommand('invalidate',{connectionId});
  },
 };
}
