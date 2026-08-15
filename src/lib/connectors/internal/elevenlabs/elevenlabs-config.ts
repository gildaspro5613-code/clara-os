/**
 * ============================================
 * CLARA OS — ElevenLabs Connector
 * --------------------------------------------
 * File : elevenlabs-config.ts
 * Responsibility : ElevenLabs environment configuration.
 * Reads and exposes API key and agent ID from environment.
 * ============================================
 */

/**
 * ElevenLabs configuration resolved from environment variables.
 */
export interface ElevenLabsConfig {
  apiKey: string;
  agentId: string;
}

/**
 * Returns the ElevenLabs configuration from environment variables.
 * Throws if required variables are missing.
 */
export function getElevenLabsConfig(): ElevenLabsConfig {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey) {
    throw new Error(
      "ElevenLabs configuration error: ELEVENLABS_API_KEY is not set.",
    );
  }

  if (!agentId) {
    throw new Error(
      "ElevenLabs configuration error: ELEVENLABS_AGENT_ID is not set.",
    );
  }

  return { apiKey, agentId };
}
