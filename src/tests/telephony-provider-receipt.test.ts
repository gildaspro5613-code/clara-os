import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
function engine(fetcher:typeof fetch){
 const path='src/lib/connectors/internal/telephony/telephony-engine.ts',require=createRequire(resolve(path)),exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>name==='@/lib/config/elevenlabs'?{elevenLabsConfig:{apiKey:'synthetic-only',agentId:'synthetic-agent',agentPhoneNumberId:'synthetic-phone'}}:require(name),fetch:fetcher,Date});
 return new (exports.TelephonyEngine as new()=>{outboundCall:(input:{operation:'outbound-call';toNumber:string})=>Promise<{success:boolean;conversationId?:string;callSid?:string}>})();
}
test('outbound HTTP 200 without a durable provider identifier cannot be reported as a started call',async()=>{
 for(const body of [{},{conversation_id:''},{callSid:' '},{conversation_id:17},{success:false,conversation_id:'synthetic-conversation'},{status:'failed',callSid:'synthetic-call'}]){
  let calls=0;const e=engine(async()=>{calls++;return Response.json(body);});const result=await e.outboundCall({operation:'outbound-call',toNumber:'+33000000000'});assert.equal(result.success,false,JSON.stringify(body));assert.equal(calls,1);
 }
});
test('existing ElevenLabs/Twilio request and attested identifier are preserved, without automatic retry',async()=>{
 let calls=0;const e=engine(async(url,init)=>{calls++;assert.match(String(url),/\/convai\/twilio\/outbound-call$/);const b=JSON.parse(String(init?.body));assert.equal(b.agent_id,'synthetic-agent');assert.equal(b.agent_phone_number_id,'synthetic-phone');return Response.json({conversation_id:'synthetic-conversation',callSid:'synthetic-call'});});
 const result=await e.outboundCall({operation:'outbound-call',toNumber:'+33000000000'});assert.equal(result.success,true);assert.equal(result.conversationId,'synthetic-conversation');assert.equal(result.callSid,'synthetic-call');assert.equal(calls,1);
});
