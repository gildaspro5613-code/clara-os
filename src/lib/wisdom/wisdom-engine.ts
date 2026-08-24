/**
 * ============================================
 * CLARA OS
 * Wisdom Module
 * --------------------------------------------
 * File : wisdom-engine.ts
 * Responsibility :
 * Coordinates Clara's professional
 * judgment process.
 * ============================================
 */

import { Wisdom } from "./wisdom";
import { WisdomContext } from "./wisdom-context";
import { Recommendation } from "./recommendation";
import { Decision } from "./decision";
import { Priority } from "./priority";

/**
 * Wisdom engine.
 */
export class WisdomEngine {

  /**
   * Builds professional wisdom.
   */
  public buildWisdom(
    context: WisdomContext,
  ): Wisdom {

    const understanding =
      context.understanding;

    const learnedKnowledge =
      context.brain.knowledge
        .getLearnedKnowledge();

    const reasons = [
      `Intention identifiée : ${understanding.intent}.`,
      `Résumé opérationnel : ${understanding.summary}.`,
      `Confiance du Brain : ${understanding.confidence}.`,
      `Importance : ${understanding.importance}.`,
      `Urgence : ${understanding.urgency}.`,
      `Impact : ${understanding.impact}.`,
    ];

    if (learnedKnowledge.length > 0) {
      reasons.push(
        `${learnedKnowledge.length} connaissance(s) apprise(s) disponible(s).`,
      );
    }

    return {

      id: crypto.randomUUID(),

      situation:
        understanding.summary,

      recommendation:
        understanding.nextAction ??
        understanding.actions[0] ??
        "Déterminer la prochaine action opérationnelle.",

      confidence:
        understanding.confidence,

      reasons,

      createdAt: new Date(),

    };

  }

  /**
   * Creates a recommendation.
   */
  public createRecommendation(
    wisdom: Wisdom,
  ): Recommendation {

    return {

      id: crypto.randomUUID(),

      title:
        wisdom.recommendation,

      description:
        `Action recommandée pour la situation suivante : ${wisdom.situation}`,

      benefits: [
        "Faire progresser concrètement la situation.",
        "Transformer le raisonnement en action opérationnelle.",
      ],

      risks: [
        "La recommandation doit être adaptée si le contexte évolue.",
      ],

      confidence:
        wisdom.confidence,

    };

  }

  /**
   * Creates a decision.
   */
  public createDecision(
    recommendation: Recommendation,
  ): Decision {

    return {

      id: crypto.randomUUID(),

      title:
        `Décision : ${recommendation.title}`,

      description:
        recommendation.description,

      recommendation,

      status: "proposed",

      requiresApproval: true,

      createdAt: new Date(),

    };

  }

  /**
   * Assigns decision priority.
   */
  public prioritize(
    decision: Decision,
  ): Priority {

    const confidence =
      decision.recommendation.confidence;

    const level =
      confidence >= 0.9
        ? "high"
        : confidence >= 0.7
          ? "medium"
          : "low";

    const reason =
      confidence >= 0.9
        ? "La recommandation présente un niveau de confiance élevé."
        : confidence >= 0.7
          ? "La recommandation présente un niveau de confiance suffisant pour une priorité opérationnelle normale."
          : "La recommandation présente un niveau de confiance limité et doit être vérifiée avant une action importante.";

    const impact =
      decision.recommendation.benefits.length > 0
        ? decision.recommendation.benefits.join(" ")
        : "Impact opérationnel à évaluer avant exécution.";

    return {

      id: crypto.randomUUID(),

      decision,

      level,

      reason,

      impact,

      createdAt: new Date(),

    };

  }

}