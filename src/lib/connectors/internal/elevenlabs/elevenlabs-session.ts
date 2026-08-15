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
 * Result returned by the signed URL endpoint.
 */
export interface ElevenLabsSignedUrlResult {
  signedUrl: string;
}

/**
 * Requests a signed WebSocket URL from ElevenLabs for the given locale.
 *
 * The active Clara system prompt for the locale is passed as a
 * conversation config override, so Clara speaks in the correct language
 * from the first utterance.
 *
 * @param locale - The active Clara OS locale (fr | en | es | de | it).
 * @returns A signed WebSocket URL valid for one conversation session.
 * @throws When the ElevenLabs API responds with an error.
 */
export async function getElevenLabsSignedUrl(
  locale: Locale,
): Promise<ElevenLabsSignedUrlResult> {
  const { apiKey, agentId } = getElevenLabsConfig();

  const body = JSON.stringify({
    agent_id: agentId,
    conversation_config_override: {
      agent: {
        prompt: {
          prompt: getClaraSystemPrompt(locale),
        },
        language: locale,
      },
    },
  });

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/v1/convai/conversation/get_signed_url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body,
    },
  );

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

  return { signedUrl: data.signed_url };
}
