/** Isolated Custom LLM protocol adapter. No public route, credentials, or provider calls. */
export type VoiceTurn = {operationId:string;sessionId:string;message:string};
export type PersistedVoiceReply = {success:true;message:string;conversationId:string};
export type VoiceTurnAuthority = {
  authorize: (turn:VoiceTurn)=>Promise<void>;
  commitViaNativeChat: (turn:VoiceTurn)=>Promise<PersistedVoiceReply>;
};
/** Reject requests that could bypass native ownership or attempt a second LLM. */
export function readCustomLLMTurn(input:unknown, operationId:string, sessionId:string):VoiceTurn {
 if(!/^[A-Za-z0-9_-]{16,80}$/.test(operationId)||!sessionId)throw Error('VOICE_SCOPE_REQUIRED');
 if(!input||typeof input!=='object')throw Error('VOICE_INVALID_PAYLOAD');
 const body=input as Record<string,unknown>;
 if(body.stream!==true||!Array.isArray(body.messages))throw Error('VOICE_INVALID_PAYLOAD');
 const messages=body.messages as unknown[];
 const last=messages.at(-1);
 if(!last||typeof last!=='object')throw Error('VOICE_USER_TURN_REQUIRED');
 const msg=last as Record<string,unknown>;
 if(msg.role!=='user'||typeof msg.content!=='string'||!msg.content.trim()||msg.content.length>16000)throw Error('VOICE_USER_TURN_REQUIRED');
 return {operationId,sessionId,message:msg.content.trim()};
}
function chunk(id:string,content:string,finishReason:string|null=null){
 return JSON.stringify({id,object:'chat.completion.chunk',created:0,model:'clara-brain',choices:[{index:0,delta:content?{content}:{},finish_reason:finishReason}]});
}
/** Produces audio-eligible text ONLY after the native chat has committed and returned its receipt. */
export async function isolatedCustomLLMSSE(turn:VoiceTurn,authority:VoiceTurnAuthority):Promise<string>{
 await authority.authorize(turn);
 const receipt=await authority.commitViaNativeChat(turn);
 if(receipt.success!==true||!receipt.message?.trim())throw Error('VOICE_NATIVE_RECEIPT_REQUIRED');
 await authority.authorize(turn);
 const id='clara-'+turn.operationId;
 return 'data: '+chunk(id,receipt.message)+'\n\ndata: '+chunk(id,'','stop')+'\n\ndata: [DONE]\n\n';
}
