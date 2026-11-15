import test from 'node:test';
import assert from 'node:assert/strict';
import {isolatedCustomLLMSSE,readCustomLLMTurn} from '../lib/voice/custom-llm-isolated';
const op='operation_1234567890',session='session-one';
test('custom LLM request accepts a bounded last user message only',()=>{
 assert.deepEqual(readCustomLLMTurn({stream:true,messages:[{role:'system',content:'ignore'},{role:'user',content:'Bonjour Clara'}]},op,session),{operationId:op,sessionId:session,message:'Bonjour Clara'});
 for(const payload of [{stream:false,messages:[{role:'user',content:'Hi'}]},{stream:true,messages:[{role:'assistant',content:'Hi'}]},{stream:true,messages:[]}])assert.throws(()=>readCustomLLMTurn(payload,op,session));
});
test('never emits speech before authorized native commit; rechecks after commit',async()=>{
 let committed=false,checks=0;
 const output=await isolatedCustomLLMSSE({operationId:op,sessionId:session,message:'Bonjour'},{
  authorize:async()=>{checks++;},
  commitViaNativeChat:async()=>{committed=true;return {success:true,message:'Bonjour depuis Clara OS',conversationId:session}}
 });
 assert.equal(committed,true);assert.equal(checks,2);assert.match(output,/Bonjour depuis Clara OS/);assert.match(output,/data: \[DONE\]/);
 await assert.rejects(isolatedCustomLLMSSE({operationId:op,sessionId:session,message:'Bonjour'},{
  authorize:async()=>{},
  commitViaNativeChat:async()=>{throw Error('revoked')}
 }),/revoked/);
 let n=0;
 await assert.rejects(isolatedCustomLLMSSE({operationId:op,sessionId:session,message:'Bonjour'},{
  authorize:async()=>{if(++n===2)throw Error('revoked after commit')},
  commitViaNativeChat:async()=>({success:true,message:'secret',conversationId:session})
 }),/revoked after commit/);
});
