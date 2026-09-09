import { KnowledgeModule } from "../module";

/**
 * Clara Live specializes Clara OS for live performance and event operations.
 * Detailed equipment knowledge remains owned by Clara Live and is accessed
 * through the Knowledge Source contract rather than copied into this module.
 */
export const CLARA_LIVE_MODULE: KnowledgeModule = {
  id: "clara-live",
  name: "Clara Live",
  version: "1.0.0",
  description: "Specialized knowledge for live performance and event operations.",
  principles: [
    "Reuse Clara OS reasoning and orchestration rather than creating a separate Brain.",
    "Keep professional equipment catalogs in their Clara Live source of truth.",
    "Never promote unverified equipment data to asserted technical facts.",
    "Keep control consoles and Show Control systems in connectors and capabilities.",
  ],
  objectives: [
    "Prepare and support live technical operations across lighting, sound, video and production.",
    "Provide domain knowledge to Clara OS without duplicating material catalogs.",
  ],
  communication: [
    "Use professional live-event terminology appropriate to the user's language and métier context.",
  ],
  vocabulary: [
    "lighting",
    "sound",
    "video",
    "production",
    "technical rider",
    "equipment",
    "connector",
    "show control",
  ],
};
