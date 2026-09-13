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

export const elevenLabsConfig = {

  /**
   * ElevenLabs API key.
   * Must remain server-side only.
   */
  apiKey:
    process.env.ELEVENLABS_API_KEY,

  /**
   * Voice used for Clara text-to-speech.
   * Must remain server-side only.
   */
  voiceId:
    process.env.ELEVENLABS_VOICE_ID,

  /**
   * ElevenLabs Conversational AI agent ID.
   * Kept for telephony/legacy integrations, not for Clara's cognitive loop.
   */
  agentId:
    process.env.ELEVENLABS_AGENT_ID,

  /**
   * ElevenLabs phone number ID attached to Clara OS.
   * Must remain server-side only.
   */
  agentPhoneNumberId:
    process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID,

} as const;
