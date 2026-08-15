/**
 * ============================================
 * CLARA OS — ElevenLabs Connector
 * --------------------------------------------
 * File : elevenlabs-session.ts
 * Responsibility :
 * Server-side generation of signed WebSocket URLs
 * for ElevenLabs Conversational AI sessions.
 *
 * The locale is wired to the session via a
 * conversation config override that injects the
 * Clara system prompt for the active language.
 * ============================================
 */

import { getClaraSystemPrompt } from "@/i18n/prompts";
import type { Locale } from "@/i18n/types";
import { getElevenLabsConfig } from "./elevenlabs-config";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

/**
 * Conversation overrides supported by the ElevenLabs React SDK.
 */
export interface ElevenLabsConversationOverrides {
  agent: {
    prompt: {
      prompt: string;
    };
    language: Locale;
  };
}

/**
 * Result returned by the signed URL endpoint.
 */
export interface ElevenLabsSignedUrlResult {
  signedUrl: string;
  overrides: ElevenLabsConversationOverrides;
}

/**
 * Returns the per-session ElevenLabs overrides for the active locale.
 */
export function getElevenLabsConversationOverrides(
  locale: Locale,
): ElevenLabsConversationOverrides {
  return {
    agent: {
      prompt: {
        prompt: getClaraSystemPrompt(locale),
      },
      language: locale,
    },
  };
}

/**
 * Requests a signed WebSocket URL from ElevenLabs for the given locale.
 *
 * The signed URL is generated server-side with the agent ID only.
 * Locale-specific prompt and language overrides are returned separately
 * and must be passed when the client starts the voice session.
 *
 * @param locale - The active Clara OS locale (fr | en | es | de | it).
 * @returns A signed WebSocket URL valid for one conversation session.
 * @throws When the ElevenLabs API responds with an error.
 */
export async function getElevenLabsSignedUrl(
  locale: Locale,
): Promise<ElevenLabsSignedUrlResult> {
  const { apiKey, agentId } = getElevenLabsConfig();
  const overrides = getElevenLabsConversationOverrides(locale);
  const url = new URL(
    "/v1/convai/conversation/get-signed-url",
    ELEVENLABS_BASE_URL,
  );
  url.searchParams.set("agent_id", agentId);
  url.searchParams.set("include_conversation_id", "true");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs signed URL request failed: ${response.status} ${text}`,
    );
  }

  const data = (await response.json()) as { signed_url?: string };

  if (!data.signed_url) {
    throw new Error("ElevenLabs signed URL response is missing signed_url.");
  }

  return { signedUrl: data.signed_url, overrides };
}
