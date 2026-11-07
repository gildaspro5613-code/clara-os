import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {RegistryError,type RegistryQuery} from '@/lib/canonical/registry';
import {CredentialStore,encryptCredentialPayload} from '@/lib/connections/credential-store';
import {createIonosReadTransport,type MailReadTransport,type MailCredentials} from '@/lib/connectors/ionos/transport';

type Proof={connectionId:string;workspaceId:string;generation:number;authorityRevision:number;leaseToken:string;cursorRevision:number};
type Claim=Proof&{claimed:boolean;address:string;encryptedPayload:string;cursor:{uid_validity?:string;last_uid?:number}};
type Connection={connection_id:string;workspace_id:string};
export type MonitorResult={status:'disabled'|'completed'|'unavailable';polled:number;failed:number;uncertain:number;skipped:number};
export function mailMonitorCommands(query:RegistryQuery){
 return async(operation:string,payload:Record<string,unknown>={})=>{
  try {
   const rows=await query`SELECT clara_native_mail_monitor_command(${operation},${JSON.stringify(payload)}::jsonb) AS data`;
   const data=(rows[0] as {data?:Record<string,unknown>})?.data;
   if(!data)throw new RegistryError(503,'MAIL_MONITOR_UNAVAILABLE');
   return data;
  }catch(error){
   const code=(error as {code?:string})?.code;
   if(code==='42501')throw new RegistryError(403,'MAIL_MONITOR_AUTHORITY_DENIED');
   if(code==='40001')throw new RegistryError(409,'MAIL_MONITOR_FENCE_CHANGED');
   if(code==='22023')throw new RegistryError(400,'MAIL_MONITOR_BATCH_DENIED');
   throw new RegistryError(503,'MAIL_MONITOR_COMMAND_REFUSED');
  }
 };
}
/** Existing scheduler invokes this, but only a separately provisioned SQL LOGIN
 * can read a mailbox. No user session, Brain, generic action or SMTP dependency.
 */
export async function runIonosMonitorTick(options:{query?:RegistryQuery;factory?:(c:MailCredentials)=>MailReadTransport}={}):Promise<MonitorResult>{
 const result:MonitorResult={status:'disabled',polled:0,failed:0,uncertain:0,skipped:0};
 if(process.env.CLARA_IONOS_MONITOR_ENABLED!=='true'||process.env.CLARA_RECETTE_MODE||process.env.VERCEL_TARGET_ENV==='clara-os-recette')return result;
 let query=options.query;
 if(!query){
  const url=process.env.CLARA_IONOS_MONITOR_DATABASE_URL;
  if(!url?.trim())return {...result,status:'unavailable'};
  query=neon(url) as unknown as RegistryQuery;
 }
 const command=mailMonitorCommands(query),factory=options.factory??createIonosReadTransport;
 let connections:Connection[];
 try{connections=(await command('list')).connections as Connection[];if(!Array.isArray(connections)||connections.length>5)throw Error('MAIL_MONITOR_LIMIT');}
 catch{return {...result,status:'unavailable'};}
 result.status='completed';
 for(const connection of connections){
  let proof:Proof|undefined;let committing=false;
  try{
   const claim=await command('claim',{connectionId:connection.connection_id,workspaceId:connection.workspace_id}) as unknown as Claim;
   if(!claim.claimed){result.skipped++;continue;}
   proof={connectionId:claim.connectionId,workspaceId:claim.workspaceId,generation:claim.generation,authorityRevision:claim.authorityRevision,leaseToken:claim.leaseToken,cursorRevision:claim.cursorRevision};
   const credentials=await new CredentialStore({async load(id){if(id!==claim.connectionId)throw Error('MAIL_MONITOR_SCOPE');return claim.encryptedPayload;},async save(){throw Error('MAIL_PROVISIONING_DISABLED');}}).get<MailCredentials>(claim.connectionId);
   if(!credentials||credentials.address!==claim.address||!credentials.folders.includes('INBOX'))throw Error('MAIL_CONFIGURATION_REQUIRED');
   // Recheck after credentials are loaded, immediately before transport creation.
   await command('check',proof);
   const batch=await factory(credentials).sync('INBOX',{uidValidity:claim.cursor.uid_validity,lastUid:Number(claim.cursor.last_uid??0)});
   const messages=batch.messages.map(m=>({uid:m.uid,id:createHash('sha256').update([claim.connectionId,'INBOX',batch.uidValidity,m.uid].join('\0')).digest('hex'),encryptedPayload:encryptCredentialPayload(m.content)}));
   // The single SQL statement revalidates role, grant, generation, owner, lease,
   // connection and cursor under locks before writing any message or cursor.
   committing=true;
   await command('commit',{...proof,uidValidity:batch.uidValidity,lastUid:batch.lastUid,uids:batch.uids,messages});
   result.polled++;
  }catch(error){
   if(committing && proof && (!(error instanceof RegistryError)||error.status>=500)){
    try{
     const status=await command('status',proof);
     if(status.lastCommitToken===proof.leaseToken){result.polled++;continue;}
    }catch{/* Read-only reconciliation cannot bypass current revocation. */}
    result.uncertain++;
   }else result.failed++;
   // No IMAP retry. A lost commit acknowledgement can mean it already committed;
   // the next scheduled read uses the durable cursor, never the old in-memory one.
   if(proof)try{await command('fail',proof);}catch{/* Revoked/stale/committed lease must not be overwritten. */}
  }
 }
 return result;
}
