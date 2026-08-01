/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : greeting.ts
 * Responsibility :
 * Generates Clara's greeting message.
 * ============================================
 */

import { ClaraSession } from "@/lib/core";

/**
 * Returns Clara's greeting message.
 */
export function buildGreeting(
  session: ClaraSession,
): string {

  switch (session.state) {

    case "WORKING":
      return [
        "Bonjour Gildas.",
        "",
        "Je suis opérationnelle.",
        "Tous les systèmes sont disponibles.",
        "Quelle est notre priorité aujourd'hui ?",
      ].join("\n");

    case "STARTING":
      return "Je démarre...";

    case "STOPPING":
      return "Je termine les tâches en cours...";

    default:
      return "Je suis en attente.";
  }
}