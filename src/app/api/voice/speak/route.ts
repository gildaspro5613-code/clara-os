import { NextResponse } from "next/server";

import { elevenLabsConfig } from "@/lib/config/elevenlabs";
import { ElevenLabsEngine } from "@/lib/connectors/internal/elevenlabs/elevenlabs-engine";

export const dynamic = "force-dynamic";

const MAX_TTS_CHARACTERS = 5000;

interface SpeakRequest {
  text?: string;
}

export async function POST(request: Request) {
  try {
    const voiceId = elevenLabsConfig.voiceId;

    if (!voiceId) {
      return NextResponse.json(
        { success: false, message: "Clara voice is not configured." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as SpeakRequest;
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Text is required." },
        { status: 400 },
      );
    }

    if (text.length > MAX_TTS_CHARACTERS) {
      return NextResponse.json(
        { success: false, message: "Text is too long for voice synthesis." },
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
          message: result.error ?? "Voice synthesis failed.",
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Voice synthesis failed.",
      },
      { status: 500 },
    );
  }
}
