/**
 * ============================================
 * CLARA OS
 * Telephony Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the native Clara OS telephony module.
 * ============================================
 */

import { TelephonyEngine } from "./telephony-engine";

export const TELEPHONY_MODULE = {
  id: "telephony",
  name: "Telephony",
  version: "1.0.0",
  description:
    "Provides native Clara OS outbound telephony through ElevenLabs Conversational AI and Twilio.",
  engine: new TelephonyEngine(),
} as const;
