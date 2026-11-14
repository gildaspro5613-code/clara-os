import {randomUUID} from 'node:crypto';
import {sql} from '@/lib/core/store/database';
import {databaseError,opaque,RegistryError,type RegistryQuery} from './registry';
import {nativeSelectors} from '@/lib/native/authority';
import {callLiveConversation} from './live-bridge';
export const CONVERSATION_LINK_CAPABILITY='conversation:link';
export interface ConversationBinding {schemaVersion:'clara.conversation-link.v1';capability:'conversation:link';productId:'clara-live';associationId:string;osUserId:string;workspaceId:string;clientId:string;projectId:string;missionId:string;nativeSessionId:string;liveUserId:string;liveProjectId:string;liveConversationId:string;identityProofId:string;projectProofId:string;expiresAt:string}
export interface ConversationLink {id:string;binding:ConversationBinding;decision:'pending'|'approved'|'revoking'|'revoked';revision:number;proof:unknown;expires_at:string}
export function conversationLinks(query:RegistryQuery=sql,call:typeof callLiveConversation=callLiveConversation){
 async function result(p:Promise<unknown[]>):Promise<ConversationLink>{try{const rows=await p;const value=(rows[0] as {data?:ConversationLink})?.data;if(!value)throw new RegistryError(503,'CONVERSATION_AUTHORITY_UNAVAILABLE');return value;}catch(e){if((e as {code?:string}).code==='40001')throw new RegistryError(409,'CONVERSATION_REVISION_CONFLICT');databaseError(e);}}
 async function command(request:Request,op:string,payload:Record<string,unknown>){const s=nativeSelectors(request);return result(query`SELECT clara_registry_conversation_command(${s.digest},${s.workspaceId},${s.clientId},${s.projectId},${s.sessionId},${op},${JSON.stringify(payload)}::jsonb) AS data`);}
 function exact(actual:unknown,expected:unknown){if(JSON.stringify(sort(actual))!==JSON.stringify(sort(expected)))throw new RegistryError(403,'CONVERSATION_PROOF_MISMATCH');}
 function sort(v:unknown):unknown{return v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sort(x)])):v;}
 return {
  command,
  product:(workspace:string,id:string,op:'inspectProduct'|'authorizeProduct'|'stopProduct')=>result(query`SELECT clara_registry_conversation_product(${opaque(workspace)},${opaque(id)},${op}) AS data`),
  request:(request:Request,requestId:string,liveConversationId:string)=>command(request,'request',{id:randomUUID(),requestId,liveConversationId:opaque(liveConversationId)}),
  async approve(request:Request,id:string,expectedRevision:number){
   const link=await command(request,'read',{id:opaque(id)});
   if(link.decision==='approved')return command(request,'approve',{id,expectedRevision,proof:link.proof});
   const response=await call('/api/core/conversation-links/verify',{associationId:link.id,binding:link.binding}) as {proof?:{binding:unknown}};
   if(!response.proof)throw new RegistryError(403,'LIVE_CONVERSATION_PROOF_REQUIRED');exact(response.proof.binding,link.binding);
   return command(request,'approve',{id,expectedRevision,proof:response.proof});
  },
  async revoke(request:Request,id:string,expectedRevision:number){
   // SQL acknowledgement precedes transport. Failure leaves a durable fence.
   const link=await command(request,'revoke',{id:opaque(id),expectedRevision});if(link.decision==='revoked')return link;
   const response=await call('/api/core/conversation-links/stop',{associationId:link.id,binding:link.binding,revision:link.revision}) as {receipt?:unknown};
   if(!response.receipt)throw new RegistryError(503,'CONVERSATION_STOP_UNCONFIRMED');
   return command(request,'stopConfirmed',{id,receipt:response.receipt});
  }
 };
}
export const canonicalConversationLinks=conversationLinks();
