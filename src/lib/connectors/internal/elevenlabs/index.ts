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

export type { ElevenLabsSignedUrlResult } from "./elevenlabs-session";
export { getElevenLabsSignedUrl } from "./elevenlabs-session";

export { ElevenLabsModule } from "./module";
