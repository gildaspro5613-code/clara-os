import {hasNativeVoiceScope,nativeVoiceOperation} from "@/lib/native/voice";
import { getTranslations } from "next-intl/server";
import { authorizeVoiceRequest } from "@/lib/auth/voice-request-authorization";
import { NextResponse } from "next/server";

import { elevenLabsConfig } from "@/lib/config/elevenlabs";
import { assertRecetteExternalExecutionBlocked } from "@/lib/recette/external-execution-guard";
import {MAX_VOICE_AUDIO_BYTES,transcribeVoiceAudio,VoiceTranscriptionError} from '@/lib/voice/transcription';

export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = MAX_VOICE_AUDIO_BYTES;

export async function GET(request:Request){
 if(!hasNativeVoiceScope(request))return Response.json({success:false},{status:403});
 return nativeVoiceOperation(request,async()=>{
  try{assertRecetteExternalExecutionBlocked("elevenlabs.voice-readiness");}catch{return Response.json({success:false,code:"NATIVE_VOICE_EXTERNAL_EXECUTION_BLOCKED"},{status:503});}
  if(!elevenLabsConfig.apiKey)return Response.json({success:false,code:"NATIVE_VOICE_CONFIG_API_KEY_MISSING"},{status:503});
  if(!elevenLabsConfig.voiceId)return Response.json({success:false,code:"NATIVE_VOICE_CONFIG_VOICE_ID_MISSING"},{status:503});
  return Response.json({success:true,code:"NATIVE_VOICE_READY",providerChecked:false});
 });
}
export async function POST(request: Request) {
 if(hasNativeVoiceScope(request))return nativeVoiceOperation(request,async(_scope,signal)=>transcribe(request,signal,true));
 return transcribe(request);
}
async function transcribe(request:Request,signal?:AbortSignal,native=false){
  const t = await getTranslations("voiceApi");
  try {
    if (!native && !await authorizeVoiceRequest(request)) return NextResponse.json({success:false,message:t("operatorRequired")}, {status:403});
    assertRecetteExternalExecutionBlocked("elevenlabs.speech-to-text");
    const apiKey = elevenLabsConfig.apiKey;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: t("notConfigured") },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const audio = form.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { success: false, message: t("audioRequired") },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { success: false, message: t("audioTooLarge") },
        { status: 413 },
      );
    }

    return NextResponse.json({success:true,...await transcribeVoiceAudio(audio,signal)});
  } catch(error) {
    if(error instanceof VoiceTranscriptionError)return NextResponse.json({success:false,message:t(error.messageKey)},{status:error.status});
    return NextResponse.json(
      {
        success: false,
        message:
          t("transcriptionFailed"),
      },
      { status: 500 },
    );
  }
}
