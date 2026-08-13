/**
 * ============================================
 * CLARA OS
 * ElevenLabs Configuration
 * --------------------------------------------
 * File : elevenlabs.ts
 * Responsibility :
 * Centralizes ElevenLabs configuration.
 * ============================================
 */

/**
 * ElevenLabs configuration.
 */
export const elevenLabsConfig = {

  /**
   * ElevenLabs API key.
   * Must remain server-side only.
   */
  apiKey:
    process.env.ELEVENLABS_API_KEY ?? "",

} as const;
