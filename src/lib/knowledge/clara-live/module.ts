import type { KnowledgeModule } from "../module";

export const CLARA_LIVE_MODULE: KnowledgeModule = {
  id: "clara-live",
  name: "Clara Live",
  version: "1.0.0",
  description: "Professional live-event specialization supplied by Clara Live without duplicating its equipment source of truth.",
  principles: [
    "Reuse Clara OS reasoning and orchestration rather than creating a separate Brain.",
    "Keep professional equipment catalogs in their Clara Live source of truth.",
    "Never promote unverified equipment data to asserted technical facts.",
    "Keep control consoles and Show Control systems in connectors and capabilities.",
  ],
  objectives: [
    "Prepare and support live operations across lighting, sound, video and production.",
    "Use Clara Live domain knowledge without duplicating its professional catalogs in Clara OS.",
  ],
  communication: [
    "Use precise professional live-event terminology while preserving Clara's single conversational identity.",
  ],
  vocabulary: [
    "lighting", "sound", "video", "production", "stage", "patch", "fixture", "console", "show control",
  ],
};
