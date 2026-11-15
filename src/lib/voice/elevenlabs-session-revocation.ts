import {ContinuousVoiceRevocationMonitor} from './continuous-voice-revocation-monitor';

export interface ElevenLabsSessionHandle {
 endSession():Promise<unknown>|unknown;
}
export interface VoiceTracks {
 stopMicrophone():Promise<void>|void;
 stopPlayback():Promise<void>|void;
}
export interface VoiceLeaseProbe {
 ():Promise<boolean>;
}
/** Binds the SDK endSession method to the native authorization monitor.
 * This does not mint a provider session and does not grant access to one.
 */
export function guardElevenLabsSession(
 sdk:ElevenLabsSessionHandle,
 tracks:VoiceTracks,
 probe:VoiceLeaseProbe,
 intervalMs=500,
){
 return new ContinuousVoiceRevocationMonitor({
  status:async()=>await probe()?'active':'revoked'
 },{
  stopMicrophone:()=>tracks.stopMicrophone(),
  stopPlayback:()=>tracks.stopPlayback(),
  endProviderSession:async()=>{await sdk.endSession();},
 },intervalMs);
}
/** Authenticated browser probe using exactly the selected native scope. */
export function firstPartyVoiceLeaseProbe(query:string,signal?:AbortSignal):VoiceLeaseProbe{
 return async()=>{
  const response=await fetch('/api/voice/lease-status'+query,{
   headers:{'x-clara-native-voice':'1'},cache:'no-store',credentials:'same-origin',signal
  });
  if(!response.ok)return false;
  const data=await response.json() as {active?:unknown};
  return data.active===true;
 };
}
