import { assertRecetteExternalExecutionBlocked } from "@/lib/recette/external-execution-guard";
/**
 * ============================================
 * CLARA OS
 * ElevenLabs Session API
 * --------------------------------------------
 * File : route.ts
 * Responsibility :
 * Creates a signed ElevenLabs Conversational AI
 * session URL for the Clara OS voice widget.
 * ============================================
 */

import { getTranslations } from "next-intl/server";
import { authorizeVoiceRequest } from "@/lib/auth/voice-request-authorization";
import { NextResponse } from "next/server";
import { elevenLabsConfig } from "@/lib/config/elevenlabs";

export async function GET(request: Request) {
  const t = await getTranslations("voiceApi");
  try {
  if (!await authorizeVoiceRequest(request)) return NextResponse.json({success:false,error:t("operatorRequired")}, {status:403});
  assertRecetteExternalExecutionBlocked('elevenlabs.signed-session');
  const { apiKey, agentId } = elevenLabsConfig;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: t("notConfigured"),
      },
      { status: 503 },
    );
  }

  if (!agentId) {
    return NextResponse.json(
      {
        success: false,
        error: t("notConfigured"),
      },
      { status: 503 },
    );
  }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {

      return NextResponse.json(
        {
          success: false,
          error: t("sessionUnavailable"),
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      signed_url?: string;
    };

    if (!data.signed_url) {
      return NextResponse.json(
        {
          success: false,
          error: t("sessionUnavailable"),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signed_url,
    }, {headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: t("sessionUnavailable"),
      },
      { status: 500 },
    );
  }
}
