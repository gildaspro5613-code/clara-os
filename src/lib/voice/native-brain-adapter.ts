import {isolatedCustomLLMSSE,readCustomLLMTurn,type VoiceTurn} from './custom-llm-isolated';

/**
 * Server-only adapter for a pre-authorized Clara session.
 * It does NOT authenticate ElevenLabs traffic and must never be exposed as a public endpoint.
 * Host integration must bind the session context to a verified server-side lease.
 */
export type NativeVoiceLease = {
 sessionId:string;
 operationId:string;
 assertCurrent:()=>Promise<void>;
 invokeNativeChat:(turn:VoiceTurn)=>Promise<{status:number;body:unknown}>;
};
export async function respondThroughNativeBrain(payload:unknown,lease:NativeVoiceLease):Promise<string>{
 const turn=readCustomLLMTurn(payload,lease.operationId,lease.sessionId);
 return isolatedCustomLLMSSE(turn,{
  authorize:lease.assertCurrent,
  commitViaNativeChat:async operation=>{
   const result=await lease.invokeNativeChat(operation);
   if(result.status!==200||!result.body||typeof result.body!=='object')throw Error('VOICE_NATIVE_COMMIT_FAILED');
   const body=result.body as Record<string,unknown>;
   if(body.success!==true||typeof body.message!=='string'||!body.message.trim())throw Error('VOICE_NATIVE_RECEIPT_REQUIRED');
   if(!Array.isArray(body.conversation))throw Error('VOICE_NATIVE_HISTORY_REQUIRED');
   const reply=body.conversation.filter((entry):entry is {id:string;role:string;content:string}=>!!entry&&typeof entry==='object'&&(entry as {role?:unknown}).role==='clara').at(-1);
   if(!reply||reply.content!==body.message||typeof reply.id!=='string')throw Error('VOICE_NATIVE_REPLY_MISMATCH');
   return {success:true,message:body.message,conversationId:operation.sessionId};
  }
 });
}
