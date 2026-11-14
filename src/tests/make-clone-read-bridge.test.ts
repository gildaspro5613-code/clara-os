import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCloneScopedReadCapability,executeCloneNativeMakeDriveRead} from '@/lib/native/make-clone-read-bridge';
import {MAKE_CAPABILITIES} from '@/lib/connectors/make/definition';

test('no canonical native session: no Make provider call even with a valid scenario key',async()=>{
 let called=0;
 const cap=makeCloneScopedReadCapability(async()=>{
  called++;throw new Error('Make provider must not be called');
 });
 await assert.rejects(()=>cap.execute(MAKE_CAPABILITIES.SCENARIO_EXECUTE,'melodie-digital',{
  scenarioKey:'find-drive-document',payload:{query:'nonexistent',workspaceId:'melodie-digital'},
 }),e=>e instanceof Error&&e.message==='NATIVE_MAKE_SCOPE_DENIED');
 assert.equal(called,0);
});
test('no provider call for WRITE, SEND, non-approved workspace or generic PREPARE',async()=>{
 let called=0;
 const cap=makeCloneScopedReadCapability(async()=>{called++;throw new Error('unexpected provider call');});
 for(const [key,scope,kind] of [
   ['notify-team','melodie-digital',MAKE_CAPABILITIES.SCENARIO_EXECUTE],
   ['create-calendar-event','melodie-digital',MAKE_CAPABILITIES.SCENARIO_EXECUTE],
   ['find-drive-document','another-workspace',MAKE_CAPABILITIES.SCENARIO_EXECUTE],
   ['find-drive-document','melodie-digital',MAKE_CAPABILITIES.SCENARIO_PREPARE],
 ] as const){
  await assert.rejects(()=>cap.execute(kind,scope,{scenarioKey:key,payload:{query:'offline'}}));
 }
 assert.equal(called,0);
});
test('chat-facing bridge refuses invalid search and non-native context',async()=>{
 await assert.rejects(()=>executeCloneNativeMakeDriveRead('  '));
 await assert.rejects(()=>executeCloneNativeMakeDriveRead('test only'),e=>e instanceof Error&&e.message==='NATIVE_SCOPE_REQUIRED');
});
