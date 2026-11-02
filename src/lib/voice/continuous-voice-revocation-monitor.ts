import {VoiceRevocationGuard,type VoiceLeaseAuthority,type VoiceAudioControl} from './voice-revocation-guard';

/** Client-only orchestration for a user-started ElevenLabs session.
 * The caller owns SDK lifecycle and passes endSession as endProviderSession.
 * A failed status probe immediately fails closed and attempts all three stops.
 */
export class ContinuousVoiceRevocationMonitor {
 private timer:ReturnType<typeof setInterval>|undefined;
 private checking=false;
 private readonly guard:VoiceRevocationGuard;
 constructor(authority:VoiceLeaseAuthority,audio:VoiceAudioControl,private readonly periodMs=500){
  this.guard=new VoiceRevocationGuard(authority,audio);
 }
 async start():Promise<void>{
  await this.guard.check();
  if(this.timer||this.guard.isStopped)return;
  this.timer=setInterval(()=>{void this.poll();},this.periodMs);
 }
 async poll():Promise<void>{
  if(this.checking||this.guard.isStopped)return;
  this.checking=true;
  try{await this.guard.check();}
  catch{await this.stop();}
  finally{this.checking=false;}
 }
 async beforeTurn(){await this.guard.check();}
 async stop(){
  if(this.timer){clearInterval(this.timer);this.timer=undefined;}
  await this.guard.stop();
 }
 get stopped(){return this.guard.isStopped;}
}
