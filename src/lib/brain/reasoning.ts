/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : reasoning.ts
 * Responsibility :
 * Analyse the current context and memory to
 * produce Clara's understanding.
 * ============================================
 */

import {
  Context,
  Memory,
  Understanding,
} from "@/types";

import { CognitiveToolLoop } from "./cognitive-tool-loop";
import { KnowledgeEngine } from "@/lib/knowledge";
import { BrainSourceContext } from "./brain-source";
import type { Mission } from "@/modules/missions/types/Mission";

/**
 * Extract the user message from an event payload.
 */
function extractTaskCompletion(
  context: Context,
): {
  taskId?: string;
  taskTitle?: string;
  mission?: {
    id: string;
    title: string;
    objective: string;
    context?: string;
  };
  success: boolean;
  message: string;
  outputs?: unknown[];
  documentId?: string;
  documentUrl?: string;
} | null {
  if (
    context.event.type !== "TASK_COMPLETED" ||
    typeof context.event.payload !== "object" ||
    context.event.payload === null ||
    !("result" in context.event.payload) ||
    typeof context.event.payload.result !== "object" ||
    context.event.payload.result === null
  ) {
    return null;
  }

  const payload = context.event.payload as {
    taskId?: unknown;
    taskTitle?: unknown;
    mission?: {
      id?: unknown;
      title?: unknown;
      objective?: unknown;
      context?: unknown;
    };
    result: {
      success?: unknown;
      message?: unknown;
      outputs?: unknown;
      documentId?: unknown;
      documentUrl?: unknown;
    };
  };

  if (
    typeof payload.result.success !== "boolean" ||
    typeof payload.result.message !== "string"
  ) {
    return null;
  }

  return {
    taskId:
      typeof payload.taskId === "string"
        ? payload.taskId
        : undefined,
    taskTitle:
      typeof payload.taskTitle === "string"
        ? payload.taskTitle
        : undefined,
    mission:
      typeof payload.mission?.id === "string" &&
      typeof payload.mission?.title === "string" &&
      typeof payload.mission?.objective === "string"
        ? {
            id: payload.mission.id,
            title: payload.mission.title,
            objective: payload.mission.objective,
            context:
              typeof payload.mission.context === "string"
                ? payload.mission.context
                : undefined,
          }
        : undefined,
    success: payload.result.success,
    message: payload.result.message,
    outputs: Array.isArray(payload.result.outputs)
      ? payload.result.outputs
      : undefined,
    documentId:
      typeof payload.result.documentId === "string"
        ? payload.result.documentId
        : undefined,
    documentUrl:
      typeof payload.result.documentUrl === "string"
        ? payload.result.documentUrl
        : undefined,
  };
}

function extractUserMessage(
  context: Context,
): string | null {

  if (
    context.event.type !== "USER_MESSAGE" ||
    typeof context.event.payload !== "object" ||
    context.event.payload === null ||
    !("message" in context.event.payload) ||
    typeof context.event.payload.message !== "string"
  ) {
    return null;
  }

  return context.event.payload.message.trim() || null;
}

/**
 * Analyse the current situation using
 * Clara's reasoning engine.
 */
export async function reasoning(
  context: Context,
  memory: Memory,
  sources: BrainSourceContext[] = [],
  mission?: Mission,
  capabilities: Array<{
    id: string;
    name: string;
    description: string;
  }> = [],
  knowledge?: KnowledgeEngine,
): Promise<Understanding> {

  const eventType = context.event.type;
  const userMessage = extractUserMessage(context);
  const taskCompletion = extractTaskCompletion(context);
  const activeMission = mission ?? undefined;

  const sourceSummary = sources.length > 0
    ? sources
        .map((source) => source.summary)
        .join("\n\n")
    : "Aucune source externe chargée.";

  const memorySummary = memory.shortTerm.length > 0
    ? memory.shortTerm.join("\n")
    : "Aucune mémoire pertinente disponible.";

  const capabilitiesSummary = capabilities.length > 0
    ? capabilities
        .map(
          (capability) =>
            `- ${capability.id}: ${capability.name} — ${capability.description}`,
        )
        .join("\n")
    : "Aucune capacité opérationnelle enregistrée.";

  const learnedKnowledge =
    knowledge?.getLearnedKnowledge() ?? [];

  const learnedKnowledgeSummary =
    learnedKnowledge.length > 0
      ? learnedKnowledge
          .map(
            (item) =>
              `- ${item.title}: ${item.description} → ${item.recommendation} (confiance: ${item.confidence})`,
          )
          .join("\n")
      : "Aucune connaissance apprise disponible.";

  /*
   * Fallback understanding.
   * Clara remains operational even if the
   * reasoning connector is unavailable.
   */
  const fallback: Understanding = {
    missionId:
      activeMission?.id ??
      taskCompletion?.mission?.id,
    intent:
      userMessage ??
      (taskCompletion
        ? "Analyser le résultat de la tâche exécutée."
        : eventType),
    summary:
      userMessage ??
      (taskCompletion
        ? `La tâche ${taskCompletion.taskId ?? "exécutée"} s'est terminée avec le statut ${taskCompletion.success ? "succès" : "échec"}. ${taskCompletion.message}`
        : `Processing event of type ${eventType}.`),
    confidence: 1,
    entities: [
      context.event.source,
      ...memory.facts,
    ],
    actions:
      userMessage
        ? ["Clarifier et organiser la prochaine action."]
        : taskCompletion
          ? [
              taskCompletion.success
                ? "Analyser le résultat obtenu et déterminer la prochaine action."
                : "Analyser l'échec de la tâche et déterminer une action corrective.",
            ]
          : ["prioritize"],
    nextAction:
      userMessage
        ? "Clarifier et organiser la prochaine action."
        : taskCompletion
          ? taskCompletion.success
            ? "Analyser le résultat obtenu et déterminer la prochaine action."
            : "Analyser l'échec de la tâche et déterminer une action corrective."
          : "prioritize",
    importance: 0.5,
    urgency: 0.5,
    impact: 0.5,
  };

  const taskCompletionInput = taskCompletion
    ? [
        "Événement : TASK_COMPLETED",
        `Mission : ${taskCompletion.mission?.title ?? "inconnue"}`,
        `Objectif : ${taskCompletion.mission?.objective ?? "inconnu"}`,
        `Contexte : ${taskCompletion.mission?.context ?? "non précisé"}`,
        `Tâche : ${taskCompletion.taskTitle ?? "inconnue"}`,
        `Succès : ${taskCompletion.success ? "oui" : "non"}`,
        `Message : ${taskCompletion.message}`,
        `Outputs : ${JSON.stringify(taskCompletion.outputs ?? [])}`,
        `Document ID : ${taskCompletion.documentId ?? "aucun"}`,
        `Document URL : ${taskCompletion.documentUrl ?? "aucune"}`,
      ].join("\\n")
    : null;

  const reasoningInput = userMessage ?? taskCompletionInput;

  const activeMissionInput = activeMission
    ? [
        "MISSION ACTIVE",
        `ID : ${activeMission.id}`,
        `Titre : ${activeMission.title}`,
        `Objectif : ${activeMission.objective}`,
        `Contexte : ${activeMission.context ?? "non précisé"}`,
        `Statut : ${activeMission.status}`,
        `Priorité : ${activeMission.priority}`,
        `Progression : ${activeMission.progress}%`,
        `Dernière action : ${activeMission.lastAction ?? "aucune"}`,
        `Prochaine action : ${activeMission.nextAction ?? "aucune"}`,
        `Résultat : ${activeMission.result ?? "aucun"}`,
        "Tâches :",
        ...activeMission.tasks.map(
          (task) =>
            `- ${task.completed ? "[TERMINÉE]" : "[À FAIRE]"} ${task.title}`,
        ),
      ].join("\n")
    : "Aucune mission active.";

  if (!reasoningInput) {
    return fallback;
  }

  const toolLoop = new CognitiveToolLoop();

  const prompt = [
    "Tu es le moteur de raisonnement de Clara OS.",
    "Analyse la demande utilisateur et transforme-la en compréhension opérationnelle.",
    "",
    "Retourne UNIQUEMENT un JSON valide, sans markdown, avec exactement ces champs :",
    '{',
    '  "intent": "nom court de la mission à accomplir",',
    '  "summary": "objectif opérationnel concret à atteindre",',
    '  "confidence": 0.0,',
    '  "entities": ["éléments importants"],',
    '  "actions": ["étape 1", "étape 2"],',
    '  "nextAction": "première action concrète à effectuer",',
    '  "importance": 0.0,',
    '  "urgency": 0.0,',
    '  "impact": 0.0',
    '}',
    "",
    "Règles :",
    "- intent doit être court et orienté mission.",
    "- summary doit exprimer le résultat recherché, pas répéter la demande.",
    "- actions doit contenir les étapes opérationnelles utiles, dans leur ordre logique.",
    "- actions doit contenir au moins une action lorsque la demande implique une action.",
    "- nextAction doit être la première action concrète et immédiatement exploitable du plan.",
    "- nextAction doit toujours être une action opérationnelle, jamais une simple constatation, reformulation ou description d'un résultat déjà obtenu.",
    "- Lorsqu'une tâche vient de réussir, ne propose pas de constater, enregistrer ou reconnaître le succès comme prochaine action.",
    "- Déduis la prochaine action utile à partir de l'objectif de la mission, du résultat obtenu et des tâches encore à faire.",
    "- Chaque action doit produire ou préparer un changement concret vers l'objectif de la mission.",
    "- Une action ne doit pas simplement décrire ce qui vient de se passer.",
    "- Ne répète pas une tâche déjà marquée [TERMINÉE].",
    "- Lorsque des tâches [À FAIRE] existent, utilise-les comme contexte et fais progresser la mission sans recréer inutilement une étape déjà planifiée.",
    "- confidence doit être comprise entre 0 et 1.",
    "- importance doit être comprise entre 0 et 1.",
    "- urgency doit être comprise entre 0 et 1.",
    "- impact doit être compris entre 0 et 1.",
    "- Ces trois dimensions doivent être évaluées séparément : ne les confonds pas.",
    "- Ne propose pas une réponse conversationnelle.",
    "- Ne crée pas de détails absents de la demande.",
    "",
    `État du système : ${context.event.type}`,
    `Source : ${context.event.source}`,
    "",
    "Sources disponibles :",
    sourceSummary,
    "",
    "Capacités opérationnelles disponibles :",
    capabilitiesSummary,
    "",
    "Mémoires pertinentes :",
    memorySummary,
    "",
    "Les mémoires fournies constituent du contexte disponible. Ne les considère pas automatiquement comme des faits certains : utilise-les seulement lorsqu'elles sont pertinentes pour comprendre la situation présente.",
    "",
    "Connaissances apprises par Clara :",
    learnedKnowledgeSummary,
    "",
    "Les connaissances apprises proviennent d'expériences précédemment validées.",
    "Utilise-les lorsqu'elles sont pertinentes pour la situation actuelle.",
    "Ne les applique pas si elles ne sont pas pertinentes.",
    "",
    "État opérationnel de la mission :",
    activeMissionInput,
    "",
    "Règles de continuité de mission :",
    "- Si une mission active est fournie, raisonne en priorité sur son état actuel.",
    "- Ne recrée pas une mission déjà en cours.",
    "- Ne propose pas de refaire une tâche déjà terminée.",
    "- Utilise la progression, les tâches, la dernière action et la prochaine action pour déterminer la suite logique.",
    "- Lorsqu'une tâche vient de réussir, considère son résultat comme un nouvel état de la mission.",
    "- La prochaine action doit faire progresser concrètement la mission vers son objectif.",
    "",
    "Entrée à analyser :",
    reasoningInput,
  ].join("\n");

  const result = await toolLoop.execute({
    prompt,
  });

  if (!result.success || !result.content.trim()) {
    return fallback;
  }

  try {

    const parsed = JSON.parse(result.content) as Partial<Understanding>;

    if (
      typeof parsed.intent !== "string" ||
      typeof parsed.summary !== "string" ||
      typeof parsed.confidence !== "number" ||
      !Array.isArray(parsed.entities) ||
      !parsed.entities.every(
        (entity) => typeof entity === "string",
      ) ||
      !Array.isArray(parsed.actions) ||
      !parsed.actions.every(
        (action) => typeof action === "string",
      ) ||
      typeof parsed.nextAction !== "string" ||
      typeof parsed.importance !== "number" ||
      typeof parsed.urgency !== "number" ||
      typeof parsed.impact !== "number"
    ) {
      return fallback;
    }

    return {
      missionId:
        activeMission?.id ??
        taskCompletion?.mission?.id,
      intent: parsed.intent,
      summary: parsed.summary,
      confidence: Math.max(
        0,
        Math.min(1, parsed.confidence),
      ),
      entities: parsed.entities,
      actions: parsed.actions,
      nextAction: parsed.nextAction,
      importance: Math.max(
        0,
        Math.min(1, parsed.importance),
      ),
      urgency: Math.max(
        0,
        Math.min(1, parsed.urgency),
      ),
      impact: Math.max(
        0,
        Math.min(1, parsed.impact),
      ),
    };

  } catch {
    return fallback;
  }
}
