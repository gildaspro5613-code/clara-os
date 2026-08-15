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

const VOICE_SESSION_WINDOW_MS = 60_000;
const VOICE_SESSION_LIMIT = 5;
const MAX_TRACKED_VOICE_SESSION_KEYS = 256;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;
const voiceSessionRequests = new Map<string, number[]>();

/**
 * Returns whether the request originates from the current application.
 */
function isTrustedVoiceSessionRequest(request: NextRequest): boolean {
  const expectedOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");

  if (origin) {
    return origin === expectedOrigin;
  }

  const referer = request.headers.get("referer");

  if (referer) {
    return referer === expectedOrigin || referer.startsWith(`${expectedOrigin}/`);
  }

  return request.headers.get("sec-fetch-site") === "same-origin";
}

/**
 * Builds a lightweight rate-limit key for voice-session minting.
 */
function getVoiceSessionRateLimitKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  return `${ip}:${userAgent}`;
}

/**
 * Returns whether the current caller exceeded the voice-session budget.
 */
function isVoiceSessionRateLimited(request: NextRequest): boolean {
  const key = getVoiceSessionRateLimitKey(request);
  const now = Date.now();
  const windowStart = now - VOICE_SESSION_WINDOW_MS;

  for (const [trackedKey, timestamps] of voiceSessionRequests.entries()) {
    const activeTimestamps = timestamps.filter(
      (timestamp) => timestamp > windowStart,
    );

    if (activeTimestamps.length === 0) {
      voiceSessionRequests.delete(trackedKey);
      continue;
    }

    voiceSessionRequests.set(trackedKey, activeTimestamps);
  }

  if (
    !voiceSessionRequests.has(key) &&
    voiceSessionRequests.size >= MAX_TRACKED_VOICE_SESSION_KEYS
  ) {
    const oldestTrackedKey = voiceSessionRequests.keys().next().value;

    if (oldestTrackedKey) {
      voiceSessionRequests.delete(oldestTrackedKey);
    }
  }

  const recentRequests = (voiceSessionRequests.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (recentRequests.length >= VOICE_SESSION_LIMIT) {
    voiceSessionRequests.set(key, recentRequests);
    return true;
  }

  recentRequests.push(now);
  voiceSessionRequests.set(key, recentRequests);

  return false;
}

/**
 * GET /api/voice/session?locale=fr
 *
 * Returns:
 *   { signedUrl: string; locale: string; overrides: object }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawLocale = request.nextUrl.searchParams.get("locale");
  const locale = resolveLocale(rawLocale);

  if (!isTrustedVoiceSessionRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized voice session request.", locale },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  if (isVoiceSessionRateLimited(request)) {
    return NextResponse.json(
      { success: false, error: "Too many voice session requests.", locale },
      { status: 429, headers: NO_STORE_HEADERS },
    );
  }

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
