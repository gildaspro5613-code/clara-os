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

    case "STARTING":
      return [
        "Bonjour Gildas.",
        "",
        "Je démarre mon environnement.",
        "J'initialise mon Brain et mes services.",
      ].join("\n");

    case "WORKING":

      if (session.recommendation) {
        return [
          "Bonjour Gildas.",
          "",
          session.recommendation.summary,
          "",
          "Quelle est notre priorité ?",
        ].join("\n");
      }

      return [
        "Bonjour Gildas.",
        "",
        "Je suis opérationnelle.",
        "Tous les systèmes sont disponibles.",
        "Quelle est notre priorité aujourd'hui ?",
      ].join("\n");

    case "STOPPING":
      return [
        "Je termine les tâches en cours.",
        "Je sécurise la session avant l'arrêt.",
      ].join("\n");

    case "STOPPED":
      return "Je suis arrêtée.";

    default:
      return "Je suis en attente.";
  }

}