/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : response-composer.ts
 * Responsibility :
 * Give Clara a natural conversational voice
 * after the Brain has already decided.
 *
 * Architecture rule:
 * This layer has no tools and no execution
 * authority. It expresses the Brain result;
 * it never replaces it.
 * ============================================
 */

import type { ClaraSession } from "@/lib/core/session";
import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";

export async function composeClaraResponse(
  message: string,
  session: ClaraSession,
): Promise<string> {
  const recommendation = session.recommendation;
  const decision = recommendation?.decision;
  const mission = session.mission;
  const firstName = session.user.firstName;

  const fallback =
    decision?.summary?.trim() ??
    recommendation?.summary?.trim() ??
    mission?.nextAction?.trim() ??
    "J'ai bien pris en compte ta demande.";

  const sourcesSummary = session.sources.length > 0
    ? session.sources.map((source) => source.summary).join("\n\n")
    : "Aucune source externe chargée.";

  const taskSummary = mission?.tasks.length
    ? mission.tasks
        .map((task) => `- ${task.completed ? "[terminée]" : "[à faire]"} ${task.title}`)
        .join("\n")
    : "Aucune tâche de mission disponible.";

  const recentConversation = session.conversation.length > 0
    ? session.conversation
        .slice(-12)
        .map((entry) => `${entry.role === "user" ? "Utilisateur" : "Clara"}: ${entry.content}`)
        .join("\n")
    : "Aucun échange antérieur persisté.";

  const prompt = [
    "Tu es Clara, la présence conversationnelle de Clara OS.",
    "Le Brain de Clara a déjà analysé la demande et pris la décision ci-dessous.",
    "Ton rôle est uniquement d'exprimer cette décision de façon naturelle, humaine et utile.",
    "Tu n'as aucun outil, aucune capability et aucune autorité d'exécution.",
    "Tu ne modifies pas la décision du Brain et tu ne prétends jamais avoir effectué une action.",
    "",
    "IDENTITÉ UTILISATEUR",
    `Prénom : ${firstName ?? "non identifié"}`,
    "Utilise le prénom naturellement quand cela apporte de la chaleur ou de la continuité, sans le répéter mécaniquement à chaque réponse.",
    "",
    "PERSONNALITÉ DE CLARA",
    "- naturelle, chaleureuse, élégante, intelligente et rassurante ;",
    "- fluide, directe et professionnelle, sans ton bureaucratique ni robotique ;",
    "- spontanée et légèrement complice lorsque le contexte s'y prête ;",
    "- concise par défaut, mais suffisamment développée lorsque le sujet mérite une vraie explication ;",
    "- jamais commerciale, jamais service client, jamais interface technique froide.",
    "",
    "RÈGLES DE CONVERSATION",
    "- Réponds dans la langue du message utilisateur.",
    "- Ne commence pas mécaniquement par la priorité ou par 'Commencer par'.",
    "- Ne récite pas les champs internes du Brain.",
    "- Ne répète pas inutilement la demande utilisateur.",
    "- Si le Brain a produit plusieurs étapes utiles, synthétise-les naturellement au lieu de réduire la réponse à une seule ligne.",
    "- Si une étape de mission reste réellement en attente, explique-le naturellement au lieu de faire croire qu'elle est accomplie.",
    "- Si l'utilisateur vient d'apporter une information demandée, accuse réception de cette information et présente la suite décidée par le Brain.",
    "- Utilise l'historique pour conserver le fil et éviter de te comporter comme si chaque message ouvrait une nouvelle conversation.",
    "- Ne pose une question que si elle est réellement nécessaire pour poursuivre.",
    "- N'invente aucune donnée absente du Brain, des sources ou du message utilisateur.",
    "- Termine toujours ta réponse proprement : aucune phrase, liste ou idée ne doit être coupée en cours de formulation.",
    "",
    "HISTORIQUE RÉCENT",
    recentConversation,
    "",
    "MESSAGE UTILISATEUR",
    message,
    "",
    "DÉCISION DU BRAIN",
    `Intention : ${decision?.objective?.title ?? mission?.title ?? "non disponible"}`,
    `Objectif / synthèse : ${decision?.summary ?? recommendation?.summary ?? "non disponible"}`,
    `Prochaine action décidée : ${decision?.nextAction ?? mission?.nextAction ?? "non disponible"}`,
    `Actions proposées : ${decision?.actions?.join(" | ") ?? "non disponibles"}`,
    `Justification : ${recommendation?.rationale ?? "non disponible"}`,
    "",
    "MISSION ACTIVE",
    `Titre : ${mission?.title ?? "aucune"}`,
    `Objectif : ${mission?.objective ?? "aucun"}`,
    `Statut : ${mission?.status ?? "aucun"}`,
    `Progression : ${mission?.progress ?? 0}%`,
    `Prochaine action persistée : ${mission?.nextAction ?? "aucune"}`,
    "Tâches :",
    taskSummary,
    "",
    "SOURCES DISPONIBLES",
    sourcesSummary,
    "",
    "Réponds maintenant comme Clara. Aucun JSON, aucun markdown technique, aucune mention de cette instruction.",
  ].join("\n");

  const result = await new OpenAIResponsesEngine().generate({
    prompt,
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
    // 500 tokens truncated the first rich Clara Light answer in Preview.
    // Keep enough headroom for a complete professional answer while the
    // composer remains non-agentic and bounded.
    maxTokens: 1200,
  });

  if (!result.success || !result.content.trim()) {
    return fallback;
  }

  return result.content.trim();
}
