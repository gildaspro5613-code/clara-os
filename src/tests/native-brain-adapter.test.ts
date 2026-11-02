import test from 'node:test';
import assert from 'node:assert/strict';
import {respondThroughNativeBrain} from '../lib/voice/native-brain-adapter';
const payload={stream:true,messages:[{role:'user',content:'Bonjour'}]};
const lease=()=>({sessionId:'thread-a',operationId:'operation_123456789',assertCurrent:async()=>{},invokeNativeChat:async()=>({status:200,body:{success:true,message:'Réponse Clara',conversation:[{id:'r1',role:'clara',content:'Réponse Clara'}]}})});
test('native adapter requires committed reply matching native history',async()=>{
 const result=await respondThroughNativeBrain(payload,lease());assert.match(result,/Réponse Clara/);
 const failed=lease();failed.invokeNativeChat=async()=>({status:202,body:{success:false}});await assert.rejects(respondThroughNativeBrain(payload,failed),/COMMIT_FAILED/);
 const mismatch=lease();mismatch.invokeNativeChat=async()=>({status:200,body:{success:true,message:'Other',conversation:[{id:'r1',role:'clara',content:'Réponse Clara'}]}});await assert.rejects(respondThroughNativeBrain(payload,mismatch),/REPLY_MISMATCH/);
});
test('revoke after commit denies emission',async()=>{
 let n=0;const l=lease();l.assertCurrent=async()=>{if(++n===2)throw Error('REVOKED')};await assert.rejects(respondThroughNativeBrain(payload,l),/REVOKED/);
});
