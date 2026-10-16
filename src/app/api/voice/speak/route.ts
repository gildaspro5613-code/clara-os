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
  const t = await getTranslations("voiceApi");
  try {
    if (!await authorizeVoiceRequest(request)) return NextResponse.json({success:false,message:t("operatorRequired")}, {status:403});
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
    });

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
