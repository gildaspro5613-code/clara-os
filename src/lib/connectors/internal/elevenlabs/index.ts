/**
 * ============================================
 * CLARA OS — ElevenLabs Connector
 * --------------------------------------------
 * File : index.ts
 * Responsibility : Public API of the ElevenLabs connector.
 * ============================================
 */

export type { ElevenLabsConfig } from "./elevenlabs-config";
export { getElevenLabsConfig } from "./elevenlabs-config";

export type { ElevenLabsConversationOverrides } from "./elevenlabs-session";
export type { ElevenLabsSignedUrlResult } from "./elevenlabs-session";
export {
  getElevenLabsConversationOverrides,
  getElevenLabsSignedUrl,
} from "./elevenlabs-session";

export { ElevenLabsModule } from "./module";
