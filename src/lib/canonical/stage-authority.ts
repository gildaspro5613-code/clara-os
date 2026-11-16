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
 async function preview(context:RegistryContext&{sessionId:string},c:string,p:string,intentId:string){
  const scope={...await authority.current(context,c,p,'read'),nativeSessionId:context.sessionId};
  const proof=await callLiveCanonical('/api/core/canonical/stage/inspect',{intentId,scope}) as {intent?:Record<string,unknown>};
  if(!proof.intent||!validStageIntent(proof.intent)||proof.intent.intentId!==intentId)throw new RegistryError(403,'LIVE_STAGE_INTENT_REQUIRED');
  return proof.intent;
 }
 async function approve(context:RegistryContext&{sessionId:string},c:string,p:string,intentId:string){
  const intent=await preview(context,c,p,intentId);
  const nonce=randomBytes(32).toString('base64url'),id=randomUUID();
  const decision=await command(context,c,p,'approve',{id,nonceHash:challengeDigest(nonce),intent});
  return {...decision,nonce};
 }
 return {command,approve,preview};
}
export const stageAuthority=createStageAuthority();

export function validStageIntent(i:Record<string,unknown>){
 return (i.schemaVersion==='clara.stage-intent.v1'&&i.capability==='stage:light:mutate:v1') ||
 (i.schemaVersion==='clara.stage-intent.v2'&&['light','sound','video','structure','production'].includes(String(i.domain))&&['create','pose','support','retire'].includes(String(i.operation))&&i.capability===`stage:${i.domain}:mutate:v2`);
}
