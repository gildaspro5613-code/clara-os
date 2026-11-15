import {authorizeNativeVoice} from '@/lib/native/voice';
import {nativeSelectors} from '@/lib/native/authority';
import type {VoiceLeaseAuthority} from './voice-revocation-guard';

/**
 * Server-side authoritative voice scope check. Requires the original authenticated
 * first-party request, never arbitrary session identifiers from ElevenLabs.
 * NOT an external-provider authentication mechanism.
 */
export function nativeVoiceLeaseAuthority(request:Request):VoiceLeaseAuthority {
 const expected=nativeSelectors(request);
 return {
  async status(){
   try{
    const current=await authorizeNativeVoice(request);
    if(current.workspaceId!==expected.workspaceId||
       current.clientId!==expected.clientId||
       current.projectId!==expected.projectId||
       current.sessionId!==expected.sessionId||
       current.digest!==expected.digest)return 'revoked';
    return 'active';
   }catch{return 'revoked';}
  }
 };
}
