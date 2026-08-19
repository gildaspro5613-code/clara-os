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

import { NextResponse } from "next/server";
import { elevenLabsConfig } from "@/lib/config/elevenlabs";

export async function GET() {
  const { apiKey, agentId } = elevenLabsConfig;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "ELEVENLABS_API_KEY is missing.",
      },
      { status: 500 },
    );
  }

  if (!agentId) {
    return NextResponse.json(
      {
        success: false,
        error: "ELEVENLABS_AGENT_ID is missing.",
      },
      { status: 500 },
    );
  }

  try {
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
      const details = await response.text();

      return NextResponse.json(
        {
          success: false,
          error: `ElevenLabs session error ${response.status}: ${details}`,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      signed_url?: string;
    };

    if (!data.signed_url) {
      return NextResponse.json(
        {
          success: false,
          error: "ElevenLabs did not return a signed session URL.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signed_url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create ElevenLabs session.",
      },
      { status: 500 },
    );
  }
}
