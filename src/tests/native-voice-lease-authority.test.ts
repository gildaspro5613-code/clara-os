import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const file='src/lib/voice/native-voice-lease-authority.ts';
test('native lease uses existing authorized scope and fails closed after revocation',async()=>{
 let allowed=true,changed=false;
 const original={workspaceId:'w',clientId:'c',projectId:'p',sessionId:'s',digest:'d'};
 const exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,require:(name:string)=>{
   if(name==='@/lib/native/voice')return {authorizeNativeVoice:async()=>{if(!allowed)throw Error('revoked');return changed?{...original,projectId:'other'}:original}};
   if(name==='@/lib/native/authority')return {nativeSelectors:()=>original};
   throw Error('Unexpected module '+name);
  }
 });
 const factory=exports.nativeVoiceLeaseAuthority as (request:Request)=>{status:()=>Promise<string>};
 const lease=factory(new Request('https://fixture.invalid/voice'));
 assert.equal(await lease.status(),'active');
 allowed=false;assert.equal(await lease.status(),'revoked');
 allowed=true;changed=true;assert.equal(await lease.status(),'revoked');
});
