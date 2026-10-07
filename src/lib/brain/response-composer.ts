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
import type { CommercialCommunicationDraft } from "@/lib/acquisition/commercial-communication-draft";
import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import { extractPhysicalActionProposal, PHYSICAL_ACTION_PROPOSAL_INSTRUCTIONS, type ConversationalPhysicalActionDraft } from "@/lib/clara/physical-action-proposal";

export interface ComposedClaraResponse {
  content: string;
  physicalAction?: ConversationalPhysicalActionDraft;
}

export interface CommercialDraftRevision {
  subject: string;
  body: string;
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

export function parseCommercialDraftRevision(
  content: string,
): CommercialDraftRevision | null {
  try {
    const parsed = parseJsonObject(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.subject !== "string" || !candidate.subject.trim() ||
      typeof candidate.body !== "string" || !candidate.body.trim()
    ) {
      return null;
    }
    return {
      subject: candidate.subject.trim(),
      body: candidate.body.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Revises the acquisition-owned draft after the canonical Brain cycle has
 * interpreted the user's request. This composer has no tools and cannot save
 * or send anything; the acquisition service remains the sole persistence
 * boundary for the returned subject/body.
 */
export async function composeCommercialDraftRevision(
  instruction: string,
  draft: CommercialCommunicationDraft,
  session: ClaraSession,
): Promise<CommercialDraftRevision | null> {
  const recentConversation = session.conversation.length > 0
    ? session.conversation
        .slice(-12)
        .map((entry) => `${entry.role === "user" ? "Utilisateur" : "Clara"}: ${entry.content}`)
        .join("\n")
    : "Aucun échange antérieur persisté.";

  const result = await new OpenAIResponsesEngine().generate({
    prompt: [
      "Tu es Clara. Le Brain a déjà traité la demande de l'utilisateur.",
      "Révise uniquement le brouillon commercial fourni selon l'instruction.",
      "Conserve les faits, le destinataire, la signature et les questions utiles.",
      "N'ajoute aucune promesse, donnée, pièce jointe ou action qui n'existe pas dans le brouillon.",
      "Ne prétends jamais envoyer le message.",
      "Réponds uniquement avec un objet JSON valide contenant exactement les clés subject et body.",
      "",
      `Instruction : ${instruction}`,
      "Historique récent — utilise-le pour résoudre les références comme « cette version », « ce message » ou « le texte précédent » :",
      recentConversation,
      `Décision Brain : ${session.recommendation?.summary ?? "non disponible"}`,
      `Mission : ${session.mission?.objective ?? "non disponible"}`,
      `Objet actuel : ${draft.subject}`,
      "Corps actuel :",
      draft.body,
    ].join("\n"),
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
    maxTokens: 1400,
  });

  if (!result.success || !result.content.trim()) return null;
  return parseCommercialDraftRevision(result.content);
}

export async function composeClaraResponseWithProposal(
  message: string,
  session: ClaraSession,
): Promise<ComposedClaraResponse> {
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
    PHYSICAL_ACTION_PROPOSAL_INSTRUCTIONS,
    "Réponds maintenant comme Clara. Le marqueur machine éventuel est interne et sera retiré avant affichage.",
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
    return { content: fallback };
  }

  const extracted = extractPhysicalActionProposal(result.content.trim());
  return { content: extracted.content.trim(), physicalAction: extracted.proposal };
}

export async function composeClaraResponse(
  message: string,
  session: ClaraSession,
): Promise<string> {
  return (await composeClaraResponseWithProposal(message, session)).content;
}
