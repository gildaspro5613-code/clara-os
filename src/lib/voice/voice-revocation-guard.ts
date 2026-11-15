/** Isolated revocation coordinator: no provider side effects until explicitly integrated. */
export type VoiceLeaseStatus = 'active'|'revoked'|'expired';
export interface VoiceLeaseAuthority {
 status():Promise<VoiceLeaseStatus>;
}
export interface VoiceAudioControl {
 stopMicrophone():void|Promise<void>;
 stopPlayback():void|Promise<void>;
 endProviderSession():void|Promise<void>;
}
export class VoiceRevokedError extends Error {
 constructor(){super('VOICE_LEASE_REVOKED');this.name='VoiceRevokedError';}
}
export async function requireActiveVoiceLease(authority:VoiceLeaseAuthority){
 if(await authority.status()!=='active')throw new VoiceRevokedError();
}
/** Observe changes from authoritative server checks; fail closed on check errors. */
export class VoiceRevocationGuard {
 private stopped=false;
 constructor(private readonly authority:VoiceLeaseAuthority,private readonly audio:VoiceAudioControl){}
 async check():Promise<void>{
  if(this.stopped)throw new VoiceRevokedError();
  try{await requireActiveVoiceLease(this.authority);}
  catch(error){await this.stop();throw error instanceof VoiceRevokedError?error:new VoiceRevokedError();}
 }
 async stop():Promise<void>{
  if(this.stopped)return;
  this.stopped=true;
  await Promise.allSettled([this.audio.stopMicrophone(),this.audio.stopPlayback(),this.audio.endProviderSession()]);
 }
 get isStopped(){return this.stopped;}
}
