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

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

/**
 * GET /api/voice/session?locale=fr
 *
 * Returns:
 *   { signedUrl: string; locale: string; overrides: object }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawLocale = request.nextUrl.searchParams.get("locale");
  const locale = resolveLocale(rawLocale);

  try {
    const { signedUrl, overrides } = await getElevenLabsSignedUrl(locale);

    return NextResponse.json(
      { signedUrl, locale, overrides },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err) {
    console.error("[voice/session] Failed to obtain ElevenLabs signed URL:", err);

    return NextResponse.json(
      { success: false, error: "Voice session unavailable.", locale },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
