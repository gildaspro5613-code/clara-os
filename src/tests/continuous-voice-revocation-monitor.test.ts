import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuousVoiceRevocationMonitor} from '../lib/voice/continuous-voice-revocation-monitor';
test('revocation during continuous voice cuts mic/output/provider and refuses later turns',async()=>{
 let valid=true;const calls:string[]=[];
 const m=new ContinuousVoiceRevocationMonitor({status:async()=>valid?'active':'revoked'},{
  stopMicrophone:()=>{calls.push('mic')},stopPlayback:()=>{calls.push('audio')},endProviderSession:()=>{calls.push('provider')}
 },60000);
 try{
  await m.start();await m.beforeTurn();valid=false;await m.poll();
  assert.equal(m.stopped,true);assert.deepEqual(calls.sort(),['audio','mic','provider']);
  await assert.rejects(m.beforeTurn(),/VOICE_LEASE_REVOKED/);
 }finally{await m.stop();}
});
test('failed authority check also stops active resources',async()=>{
 let checked=0,stops=0;
 const m=new ContinuousVoiceRevocationMonitor({status:async()=>{checked++;if(checked>1)throw Error('network');return 'active';}},{
  stopMicrophone:()=>{stops++},stopPlayback:()=>{stops++},endProviderSession:()=>{stops++}
 },60000);
 try{await m.start();await m.poll();assert.equal(stops,3);assert.equal(m.stopped,true);}
 finally{await m.stop();}
});
