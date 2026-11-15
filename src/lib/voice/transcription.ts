import {elevenLabsConfig} from '@/lib/config/elevenlabs';
import {assertRecetteExternalExecutionBlocked} from '@/lib/recette/external-execution-guard';

export const MAX_VOICE_AUDIO_BYTES=15*1024*1024;
export class VoiceTranscriptionError extends Error {
 constructor(readonly status:number,readonly messageKey:string){super(messageKey);}
}
/** The existing Scribe provider operation, shared by native and product IO.
 * Authentication stays in each caller. Never return provider diagnostics. */
export async function transcribeVoiceAudio(audio:File,signal?:AbortSignal){
 assertRecetteExternalExecutionBlocked('elevenlabs.speech-to-text');
 if(!elevenLabsConfig.apiKey)throw new VoiceTranscriptionError(503,'notConfigured');
 if(!audio.size)throw new VoiceTranscriptionError(400,'audioRequired');
 if(audio.size>MAX_VOICE_AUDIO_BYTES)throw new VoiceTranscriptionError(413,'audioTooLarge');
 const payload=new FormData();payload.append('file',audio,audio.name||'clara-voice.webm');payload.append('model_id','scribe_v2');
 const response=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':elevenLabsConfig.apiKey},body:payload,cache:'no-store',signal});
 const data=await response.json() as {text?:unknown;language_code?:unknown};
 if(!response.ok)throw new VoiceTranscriptionError(502,'transcriptionFailed');
 const text=typeof data.text==='string'?data.text.trim():'';
 if(!text)throw new VoiceTranscriptionError(422,'noSpeech');
 return {text,language:typeof data.language_code==='string'?data.language_code:null};
}
