import { getTranslations } from "next-intl/server";
import { authorizeVoiceRequest } from "@/lib/auth/voice-request-authorization";
import { NextResponse } from "next/server";

import { elevenLabsConfig } from "@/lib/config/elevenlabs";
import { assertRecetteExternalExecutionBlocked } from "@/lib/recette/external-execution-guard";

export const dynamic = "force-dynamic";

const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const t = await getTranslations("voiceApi");
  try {
    if (!await authorizeVoiceRequest(request)) return NextResponse.json({success:false,message:t("operatorRequired")}, {status:403});
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

    const payload = new FormData();
    payload.append("file", audio, audio.name || "clara-voice.webm");
    payload.append("model_id", "scribe_v2");

    const response = await fetch(ELEVENLABS_STT_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: payload,
      cache: "no-store",
    });

    const data = (await response.json()) as {
      text?: string;
      language_code?: string;
      detail?: unknown;
    };

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: t("transcriptionFailed"),
        },
        { status: 502 },
      );
    }

    const text = data.text?.trim();

    if (!text) {
      return NextResponse.json(
        { success: false, message: t("noSpeech") },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      text,
      language: data.language_code ?? null,
    });
  } catch {
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
