import {databaseError,RegistryError,type RegistryQuery} from '@/lib/canonical/registry';
import {nativeContext} from './scoped-context';
import {CredentialStore,type CredentialPersistence} from '@/lib/connections/credential-store';
export function nativeMailCommands(query?:RegistryQuery){return async(operation:string,payload:Record<string,unknown>={})=>{
 const ctx=nativeContext();if(!ctx)throw new RegistryError(403,'MAIL_SCOPE_REQUIRED');const s=ctx.scope;
 try{const rows=await (query??ctx.query)`SELECT clara_native_mail_command(${s.digest},${s.workspaceId},${s.clientId},${s.projectId},${s.sessionId},${operation},${JSON.stringify(payload)}::jsonb) AS data`;return (rows[0] as {data:Record<string,unknown>}).data;}
 catch(error){if((error as {code?:string}).code==='40001')throw new RegistryError(409,'MAIL_REVISION_CONFLICT');databaseError(error);}
};}
export const nativeMailCommand=nativeMailCommands();
export function mailCredentialStore(connectionId:string){const persistence:CredentialPersistence={async load(id){if(id!==connectionId)throw new RegistryError(403,'MAIL_SCOPE_DENIED');const r=await nativeMailCommand('credentials',{connectionId});return typeof r.encryptedPayload==='string'?r.encryptedPayload:null;},async save(){throw new RegistryError(403,'MAIL_PROVISIONING_DISABLED');}};return new CredentialStore(persistence);}
