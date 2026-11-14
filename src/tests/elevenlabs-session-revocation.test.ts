import test from 'node:test';
import assert from 'node:assert/strict';
import {guardElevenLabsSession} from '../lib/voice/elevenlabs-session-revocation';
test('a real SDK-shaped session endSession is invoked when native lease is revoked',async()=>{
 let active=true;const calls:string[]=[];
 const monitor=guardElevenLabsSession({endSession:async()=>{calls.push('endSession')}},{
  stopMicrophone:()=>{calls.push('microphone')},
  stopPlayback:()=>{calls.push('playback')}
 },async()=>active,60000);
 try{
  await monitor.start();active=false;await monitor.poll();
  assert.equal(monitor.stopped,true);
  assert.deepEqual(calls.sort(),['endSession','microphone','playback']);
  await assert.rejects(monitor.beforeTurn(),/VOICE_LEASE_REVOKED/);
 }finally{await monitor.stop();}
});
