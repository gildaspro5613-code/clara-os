import {randomUUID} from 'node:crypto';
import {sql} from '@/lib/core/store/database';
import {RegistryError} from '@/lib/canonical/registry';
import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {nativeFailure} from '@/lib/native/authority';
import {encryptCredentialPayload} from '@/lib/connections/credential-store';
import {
 makeNativeDriveCredentials,validateMakeReadConnectionInput,
 verifyMakeReadConnection,
} from '@/lib/connectors/make/native-api-onboarding';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};

/** Scoped non-secret connection status; never uses the global MD workspace. */
export async function GET(request:Request){
 try{
  return await withNativeScope(request,false,async()=>{
   const ctx=nativeContext();
   if(!ctx)throw new RegistryError(403,'MAKE_NATIVE_SESSION_REQUIRED');
   const rows=await sql`
    SELECT status FROM clara_connections
    WHERE workspace_id=${ctx.scope.workspaceId} AND provider='make'
    LIMIT 1
   ` as Array<{status:string}>;
   return Response.json({provider:'make',status:rows[0]?.status??'NOT_CONFIGURED',
    connected:rows[0]?.status==='ACTIVE',certified:false},{headers});
  });
 }catch(e){return nativeFailure(e);}
}

/** One-time, owner-approved supplier onboarding inside Clara OS itself.
 * The API token is encrypted before SQL and never returned or logged.
 * A successful provider metadata GET is not an E2E certification.
 * No scenario runs, no automatic READ grants, and no WRITE/SEND.
 */
export async function POST(request:Request){
 try{
  return await withNativeScope(request,true,async()=>{
   if(!request.headers.get('content-type')?.startsWith('application/json'))
    throw new RegistryError(415,'MAKE_INVALID_MEDIA_TYPE');
   const content=await request.text();
   if(content.length>5500)throw new RegistryError(413,'MAKE_INPUT_TOO_LARGE');
   let v:Record<string,unknown>;
   try{
    const obj:unknown=JSON.parse(content);
    if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error();
    v=obj as Record<string,unknown>;
   }catch{throw new RegistryError(400,'MAKE_INVALID_CONNECTION');}
   if(Object.keys(v).sort().join('|')!=='approved|scenarioId|token|zone'||v.approved!==true)
    throw new RegistryError(400,'MAKE_APPROVAL_REQUIRED');
   let cfg:ReturnType<typeof validateMakeReadConnectionInput>;
   try{
    cfg=validateMakeReadConnectionInput({
     token:v.token,zone:v.zone,scenarioId:v.scenarioId,
    });
   }catch{throw new RegistryError(400,'MAKE_INVALID_CONNECTION');}
   const ctx=nativeContext();
   if(!ctx||!ctx.writable)throw new RegistryError(403,'MAKE_NATIVE_SESSION_REQUIRED');
   const scope=ctx.scope;
   // Approval is reserved to native workspace owners/admins with both
   // selected client and project management permissions.
   const rights=await sql`
    SELECT EXISTS(
     SELECT 1 FROM clara_workspace_memberships wm
     JOIN clara_registry_client_access ca
      ON ca.workspace_id=wm.workspace_id AND ca.user_id=wm.user_id
     JOIN clara_registry_project_access pa
      ON pa.workspace_id=wm.workspace_id AND pa.user_id=wm.user_id
     WHERE wm.workspace_id=${scope.workspaceId}
       AND wm.user_id=${ctx.userId}
       AND wm.revoked_at IS NULL AND wm.role IN ('owner','admin')
       AND ca.client_id=${scope.clientId} AND ca.can_manage
       AND ca.revoked_at IS NULL
       AND pa.project_id=${scope.projectId} AND pa.can_manage
       AND pa.revoked_at IS NULL
    ) AS can_connect
   ` as Array<{can_connect:boolean}>;
   if(rights[0]?.can_connect!==true)
    throw new RegistryError(403,'MAKE_CONNECTION_PERMISSION_DENIED');
   // Never replace a pre-existing Make account, even if unverified:
   // changes of token/account must go through a separate explicit flow.
   const existing=await sql`
    SELECT id FROM clara_connections
    WHERE workspace_id=${scope.workspaceId} AND provider='make' LIMIT 1
   ` as Array<{id:string}>;
   if(existing.length)
    throw new RegistryError(409,'MAKE_CONNECTION_ALREADY_EXISTS');
   if(!await verifyMakeReadConnection(cfg))
    throw new RegistryError(422,'MAKE_READ_SCENARIO_NOT_VERIFIED');
   const id=randomUUID();
   const encrypted=encryptCredentialPayload(makeNativeDriveCredentials(cfg));
   // One database statement: create the connection and encrypted secret
   // atomically, without ever rendering an ACTIVE account with no secret.
   const rows=await sql`
    WITH created AS (
     INSERT INTO clara_connections(
      id,workspace_id,provider,status,scopes,created_at,updated_at
     ) VALUES (
      ${id},${scope.workspaceId},'make','ACTIVE',
      ${JSON.stringify(['make:scenario:find-drive-document'])}::jsonb,NOW(),NOW()
     )
     ON CONFLICT (workspace_id,provider) DO NOTHING
     RETURNING id
    )
    INSERT INTO clara_connection_credentials(connection_id,encrypted_payload,updated_at)
    SELECT created.id,${encrypted},NOW() FROM created
    RETURNING connection_id
   ` as Array<{connection_id:string}>;
   if(rows.length!==1||rows[0]?.connection_id!==id)
    throw new RegistryError(409,'MAKE_CONNECTION_ALREADY_EXISTS');
   return Response.json({
    provider:'make',connected:true,certified:false,
    status:'ACTIVE',capabilityId:'make.drive.find',
    // Real authorizations are separate and require explicit approval.
    authorizationRequired:true,
   },{headers});
  });
 }catch(e){return nativeFailure(e);}
}
