/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : briefs.ts
 * Responsibility :
 * Builds Clara's operational briefings.
 * ============================================
 */

import { ClaraSession } from "@/lib/core";

/**
 * Builds Clara's daily briefing.
 */
export function buildDailyBrief(
  session: ClaraSession,
): string {

  if (session.recommendation) {
    return [
      "Bonjour Gildas.",
      "",
      "J'ai terminé mon analyse.",
      "",
      session.recommendation.summary,
      "",
      "Je suis prête à commencer la journée.",
    ].join("\n");
  }

  return [
    "Bonjour Gildas.",
    "",
    "Tous les systèmes sont opérationnels.",
    "Je suis prête à commencer la journée.",
  ].join("\n");

}