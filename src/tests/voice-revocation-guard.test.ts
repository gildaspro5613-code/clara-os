import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceRevocationGuard,VoiceRevokedError,requireActiveVoiceLease} from '../lib/voice/voice-revocation-guard';

test('an active lease permits turns; a revoked or expired lease denies them',async()=>{
 await requireActiveVoiceLease({status:async()=> 'active'});
 for(const status of ['revoked','expired'] as const)
  await assert.rejects(requireActiveVoiceLease({status:async()=>status}),VoiceRevokedError);
});
test('revocation stops microphone, audio and provider session only once',async()=>{
 let status:'active'|'revoked'='active';const stopped:string[]=[];
 const guard=new VoiceRevocationGuard({status:async()=>status},{
  stopMicrophone:()=>{stopped.push('mic')},
  stopPlayback:()=>{stopped.push('audio')},
  endProviderSession:()=>{stopped.push('session')}
 });
 await guard.check();status='revoked';
 await assert.rejects(guard.check(),VoiceRevokedError);
 assert.deepEqual(stopped.sort(),['audio','mic','session']);
 await assert.rejects(guard.check(),VoiceRevokedError);
 assert.equal(stopped.length,3);
});
test('network or authority lookup failure fails closed and stops all audio',async()=>{
 let stopped=0;
 const guard=new VoiceRevocationGuard({status:async()=>{throw Error('offline')}},{
  stopMicrophone:()=>{stopped++},stopPlayback:()=>{stopped++},endProviderSession:()=>{stopped++}
 });
 await assert.rejects(guard.check(),VoiceRevokedError);
 assert.equal(stopped,3);
});
