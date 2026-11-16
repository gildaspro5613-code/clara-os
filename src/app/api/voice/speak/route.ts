import {hasNativeVoiceScope,nativeVoiceOperation} from "@/lib/native/voice";
import {nativeCommand} from "@/lib/native/scoped-context";
import {RegistryError} from "@/lib/canonical/registry";
import { getTranslations } from "next-intl/server";
import { authorizeVoiceRequest } from "@/lib/auth/voice-request-authorization";
import { NextResponse } from "next/server";

import { elevenLabsConfig } from "@/lib/config/elevenlabs";
import { ElevenLabsEngine } from "@/lib/connectors/internal/elevenlabs/elevenlabs-engine";

export const dynamic = "force-dynamic";

const MAX_TTS_CHARACTERS = 5000;

interface SpeakRequest {
  text?: string;
}

export async function POST(request: Request) {
 if(hasNativeVoiceScope(request))return nativeVoiceOperation(request,async(scope,signal)=>{
  const body=await request.json();
  if(Object.keys(body).some(k=>k!=="messageId")||typeof body.messageId!=="string")throw new RegistryError(400,"NATIVE_VOICE_MESSAGE_REQUIRED");
  const history=await nativeCommand(scope,"history",{limit:100});
  const message=(history.messages as Array<{id:string;role:string;content:string}>).find(m=>m.id===body.messageId&&m.role==="clara");
  if(!message)throw new RegistryError(403,"NATIVE_VOICE_MESSAGE_DENIED");
  return speak(new Request(request.url,{method:"POST",body:JSON.stringify({text:message.content})}),signal,true);
 });
 return speak(request);
}
async function speak(request:Request,signal?:AbortSignal,native=false){
  const t = await getTranslations("voiceApi");
  try {
    if (!native && !await authorizeVoiceRequest(request)) return NextResponse.json({success:false,message:t("operatorRequired")}, {status:403});
    const voiceId = elevenLabsConfig.voiceId;

    if (!voiceId) {
      return NextResponse.json(
        { success: false, message: t("notConfigured") },
        { status: 503 },
      );
    }

    const body = (await request.json()) as SpeakRequest;
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { success: false, message: t("textRequired") },
        { status: 400 },
      );
    }

    if (text.length > MAX_TTS_CHARACTERS) {
      return NextResponse.json(
        { success: false, message: t("textTooLong") },
        { status: 413 },
      );
    }

    const engine = new ElevenLabsEngine();
    const result = await engine.textToSpeech({
      operation: "text-to-speech",
      text,
      voiceId,
    },signal);

    if (!result.success || !result.audioBuffer) {
      return NextResponse.json(
        {
          success: false,
          message: t("synthesisFailed"),
        },
        { status: 502 },
      );
    }

    return new Response(result.audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          t("synthesisFailed"),
      },
      { status: 500 },
    );
  }
}
