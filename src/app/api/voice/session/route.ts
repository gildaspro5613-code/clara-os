/**
 * ============================================
 * CLARA OS — API
 * --------------------------------------------
 * File : /api/voice/session/route.ts
 * Responsibility :
 * Returns a signed ElevenLabs WebSocket URL for
 * the requested locale.
 *
 * The locale drives the Clara system prompt override
 * so Clara speaks in the correct language from the
 * first utterance of the session.
 * ============================================
 */

import { NextRequest, NextResponse } from "next/server";

import { getElevenLabsSignedUrl } from "@/lib/connectors/internal/elevenlabs";
import { resolveLocale } from "@/i18n/config";

/**
 * GET /api/voice/session?locale=fr
 *
 * Returns:
 *   { signedUrl: string; locale: string }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawLocale = request.nextUrl.searchParams.get("locale");
  const locale = resolveLocale(rawLocale);

  try {
    const { signedUrl } = await getElevenLabsSignedUrl(locale);

    return NextResponse.json({ signedUrl, locale });
  } catch (err) {
    console.error("[voice/session] Failed to obtain ElevenLabs signed URL:", err);

    return NextResponse.json(
      { success: false, error: "Voice session unavailable." },
      { status: 500 },
    );
  }
}
