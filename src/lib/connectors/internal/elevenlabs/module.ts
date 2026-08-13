/**
 * ============================================
 * CLARA OS
 * ElevenLabs Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the ElevenLabs connector module.
 * ============================================
 */

import { ElevenLabsEngine } from "./elevenlabs-engine";

/**
 * ElevenLabs connector module.
 */
export const ELEVENLABS_MODULE = {

  id: "elevenlabs",

  name: "ElevenLabs",

  version: "1.0.0",

  description:
    "Provides text-to-speech and voice management capabilities " +
    "through ElevenLabs for Clara OS.",

  engine: new ElevenLabsEngine(),

} as const;
