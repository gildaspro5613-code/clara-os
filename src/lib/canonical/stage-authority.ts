import {randomBytes,randomUUID} from 'node:crypto';
import {sql} from '@/lib/core/store/database';
import {challengeDigest,databaseError,RegistryError,type RegistryContext,type RegistryQuery} from './registry';
import {createCanonicalArchiveAuthority} from './archive-authority';
import {callLiveCanonical} from './live-bridge';
export function createStageAuthority(query:RegistryQuery=sql){
 const authority=createCanonicalArchiveAuthority(query);
 async function command(context:RegistryContext,c:string,p:string,op:string,payload:Record<string,unknown>){
  try{const rows=await query`SELECT clara_registry_stage_command(${context.digest},${context.workspaceId},${c},${p},${op},${JSON.stringify(payload)}::jsonb) AS result`;
   if(!rows[0]||(rows[0] as {result?:unknown}).result===undefined)throw new RegistryError(503,'STAGE_AUTHORITY_UNAVAILABLE');
   return (rows[0] as {result:Record<string,unknown>}).result;
  }catch(e){if(e&&typeof e==='object'&&'code' in e&&e.code==='40001')throw new RegistryError(409,'STAGE_CANCELLATION_REQUIRED');databaseError(e);}
 }
 async function approve(context:RegistryContext&{sessionId:string},c:string,p:string,intentId:string){
  const scope={...await authority.current(context,c,p,'read'),nativeSessionId:context.sessionId};
  const proof=await callLiveCanonical('/api/core/canonical/stage/inspect',{intentId,scope}) as {intent?:Record<string,unknown>};
  if(!proof.intent||proof.intent.schemaVersion!=='clara.stage-intent.v1'||proof.intent.capability!=='stage:light:mutate:v1'||proof.intent.intentId!==intentId)throw new RegistryError(403,'LIVE_STAGE_INTENT_REQUIRED');
  const nonce=randomBytes(32).toString('base64url'),id=randomUUID();
  const decision=await command(context,c,p,'approve',{id,nonceHash:challengeDigest(nonce),intent:proof.intent});
  return {...decision,nonce};
 }
 return {command,approve};
}
export const stageAuthority=createStageAuthority();
