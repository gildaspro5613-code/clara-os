import {randomUUID} from 'node:crypto';
import {nativeFailure} from '@/lib/native/authority';
import {withNativeScope,nativeContext} from '@/lib/native/scoped-context';
import {registryBody,sameOrigin,fields} from '@/lib/canonical/http';
import {RegistryError,databaseError} from '@/lib/canonical/registry';
import {encryptCredentialPayload} from '@/lib/connections/credential-store';
import {validateMailConfig,IONOS_MAILBOX_ADDRESSES,type MailCredentials} from '@/lib/connectors/ionos/transport';

// Provisioning stays disabled until the operator explicitly enables it in Production.
// This endpoint has no IMAP or SMTP side effects and never returns credential material.
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  sameOrigin(request);
  if(process.env.CLARA_IONOS_PROVISIONING_ENABLED!=='true')
   throw new RegistryError(503,'MAIL_PROVISIONING_NOT_ENABLED');
  const b=await registryBody(request);
  fields(b,['address','password','confirmed']);
  if(typeof b.address!=='string'||!(IONOS_MAILBOX_ADDRESSES as readonly string[]).includes(b.address)||b.confirmed!==true||typeof b.password!=='string')
   throw new RegistryError(400,'MAIL_CONFIGURATION_REQUIRED');
  const credentials:MailCredentials={
   address:b.address,password:b.password,
   imapHost:'imap.ionos.fr',imapPort:993,
   smtpHost:'smtp.ionos.fr',smtpPort:465,
   folders:['INBOX'],configurationReviewed:true
  };
  validateMailConfig(credentials);
  return await withNativeScope(request,false,async()=>{
   const ctx=nativeContext();
   if(!ctx)throw new RegistryError(403,'MAIL_SCOPE_REQUIRED');
   const {workspaceId,clientId,projectId,digest}=ctx.scope;
   if(workspaceId!=='melodie-digital')throw new RegistryError(403,'MAIL_SCOPE_DENIED');
   const connectionId=randomUUID(),encrypted=encryptCredentialPayload(credentials);
   let rows:Array<{created_id?:string}>;
   try{
    // One SQL statement: successful insertion of all three records is atomic.
    // Eligibility derives from the actual authenticated session and current
    // scoped client/project ownership; an email address confers no authority.
    rows=await ctx.query`
WITH eligible AS (
 SELECT s.user_id
 FROM clara_auth_sessions s
 JOIN clara_auth_identities i ON i.user_id=s.user_id
 JOIN clara_workspace_memberships w ON w.user_id=s.user_id
 JOIN clara_registry_client_access ca ON ca.workspace_id=w.workspace_id AND ca.user_id=w.user_id AND ca.client_id=${clientId}
 JOIN clara_registry_project_access pa ON pa.workspace_id=w.workspace_id AND pa.user_id=w.user_id AND pa.project_id=${projectId}
 JOIN clara_registry_clients c ON c.workspace_id=w.workspace_id AND c.id=ca.client_id
 JOIN clara_registry_projects p ON p.workspace_id=w.workspace_id AND p.id=pa.project_id AND p.client_id=c.id
 WHERE s.token_hash=${digest} AND s.revoked_at IS NULL AND s.expires_at>NOW()
   AND s.user_id=${ctx.userId}
   AND w.workspace_id=${workspaceId} AND w.role='owner' AND w.revoked_at IS NULL
   AND ca.can_read AND ca.can_manage AND ca.revoked_at IS NULL
   AND pa.can_read AND pa.can_manage AND pa.revoked_at IS NULL
   AND c.revoked_at IS NULL AND p.revoked_at IS NULL
   AND NOT EXISTS(
    SELECT 1 FROM clara_native_mail_authority a
    WHERE a.address=${b.address} AND a.revoked_at IS NULL
   )
 LIMIT 1
), connection_insert AS (
 INSERT INTO clara_connections(id,workspace_id,provider,status,scopes)
 SELECT ${connectionId},${workspaceId},'ionos','ACTIVE','[]'::jsonb FROM eligible
 RETURNING id
), credential_insert AS (
 INSERT INTO clara_connection_credentials(connection_id,encrypted_payload)
 SELECT id,${encrypted} FROM connection_insert RETURNING connection_id
), authority_insert AS (
 INSERT INTO clara_native_mail_authority
 (connection_id,workspace_id,owner_user_id,address,reviewed_by,review_reason)
 SELECT c.id,${workspaceId},e.user_id,${b.address},
        e.user_id,'Explicit owner self-provisioning in Clara OS: initial IMAP-only mailbox connection'
 FROM connection_insert c CROSS JOIN eligible e
 JOIN credential_insert k ON k.connection_id=c.id
 RETURNING connection_id
)
SELECT connection_id AS created_id FROM authority_insert` as Array<{created_id?:string}>;
   }catch(err){databaseError(err);}
   if(rows.length!==1||rows[0].created_id!==connectionId)
    throw new RegistryError(403,'MAIL_PROVISIONING_DENIED');
   return Response.json({success:true,address:b.address,status:'saved_awaiting_imap_verification'},{headers:{'Cache-Control':'no-store'}});
  });
 }catch(error){return nativeFailure(error);}
}
