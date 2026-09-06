/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : reasoning.ts
 * Responsibility :
 * Analyse the current context and memory to
 * produce Clara's understanding.
 *
 * Architecture rule:
 * GPT is a cognitive provider of the Brain.
 * It never executes Clara capabilities here.
 * ============================================
 */

import { Context, Memory, Understanding } from "@/types";
import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import { KnowledgeEngine } from "@/lib/knowledge";
import { BrainSourceContext } from "./brain-source";
import type { Mission } from "@/modules/missions/types/Mission";

function extractTaskCompletion(context: Context): {
  taskId?: string;
  taskTitle?: string;
  mission?: { id: string; title: string; objective: string; context?: string };
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
  ) return null;

  const payload = context.event.payload as {
    taskId?: unknown;
    taskTitle?: unknown;
    mission?: { id?: unknown; title?: unknown; objective?: unknown; context?: unknown };
    result: { success?: unknown; message?: unknown; outputs?: unknown; documentId?: unknown; documentUrl?: unknown };
  };

  if (typeof payload.result.success !== "boolean" || typeof payload.result.message !== "string") return null;

  return {
    taskId: typeof payload.taskId === "string" ? payload.taskId : undefined,
    taskTitle: typeof payload.taskTitle === "string" ? payload.taskTitle : undefined,
    mission:
      typeof payload.mission?.id === "string" &&
      typeof payload.mission?.title === "string" &&
      typeof payload.mission?.objective === "string"
        ? {
            id: payload.mission.id,
            title: payload.mission.title,
            objective: payload.mission.objective,
            context: typeof payload.mission.context === "string" ? payload.mission.context : undefined,
          }
        : undefined,
    success: payload.result.success,
    message: payload.result.message,
    outputs: Array.isArray(payload.result.outputs) ? payload.result.outputs : undefined,
    documentId: typeof payload.result.documentId === "string" ? payload.result.documentId : undefined,
    documentUrl: typeof payload.result.documentUrl === "string" ? payload.result.documentUrl : undefined,
  };
}

function extractUserMessage(context: Context): string | null {
  if (
    context.event.type !== "USER_MESSAGE" ||
    typeof context.event.payload !== "object" ||
    context.event.payload === null ||
    !("message" in context.event.payload) ||
    typeof context.event.payload.message !== "string"
  ) return null;

  return context.event.payload.message.trim() || null;
}

export async function reasoning(
  context: Context,
  memory: Memory,
  sources: BrainSourceContext[] = [],
  mission?: Mission,
  capabilities: Array<{ id: string; name: string; description: string }> = [],
  knowledge?: KnowledgeEngine,
): Promise<Understanding> {
  const eventType = context.event.type;
  const userMessage = extractUserMessage(context);
  const taskCompletion = extractTaskCompletion(context);
  const activeMission = mission ?? undefined;

  const sourceSummary = sources.length > 0
    ? sources.map((source) => source.summary).join("\n\n")
    : "Aucune source externe chargée.";

  const memorySummary = memory.shortTerm.length > 0
    ? memory.shortTerm.join("\n")
    : "Aucune mémoire pertinente disponible.";

  // Capabilities are context owned by Clara. They inform GPT about what Clara
  // can do, but they are deliberately not exposed as executable model tools.
  const capabilitiesSummary = capabilities.length > 0
    ? capabilities.map((capability) => `- ${capability.id}: ${capability.name} — ${capability.description}`).join("\n")
    : "Aucune capacité opérationnelle enregistrée.";

  const learnedKnowledge = knowledge?.getLearnedKnowledge() ?? [];
  const learnedKnowledgeSummary = learnedKnowledge.length > 0
    ? learnedKnowledge
        .map((item) => `- ${item.title}: ${item.description} → ${item.recommendation} (confiance: ${item.confidence})`)
        .join("\n")
    : "Aucune connaissance apprise disponible.";

  const fallback: Understanding = {
    missionId: activeMission?.id ?? taskCompletion?.mission?.id,
    intent: userMessage ?? (taskCompletion ? "Analyser le résultat de la tâche exécutée." : eventType),
    summary: userMessage ?? (taskCompletion
      ? `La tâche ${taskCompletion.taskId ?? "exécutée"} s'est terminée avec le statut ${taskCompletion.success ? "succès" : "échec"}. ${taskCompletion.message}`
      : `Processing event of type ${eventType}.`),
    confidence: 1,
    entities: [context.event.source, ...memory.facts],
    actions: userMessage
      ? ["Structurer la réponse opérationnelle à partir du contexte disponible."]
      : taskCompletion
        ? [taskCompletion.success
            ? "Analyser le résultat obtenu et déterminer la prochaine action."
            : "Analyser l'échec de la tâche et déterminer une action corrective."]
        : ["prioritize"],
    nextAction: userMessage
      ? "Structurer la réponse opérationnelle à partir du contexte disponible."
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
      ].join("\n")
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
        ...activeMission.tasks.map((task) => `- ${task.completed ? "[TERMINÉE]" : "[À FAIRE]"} ${task.title}`),
      ].join("\n")
    : "Aucune mission active.";

  if (!reasoningInput) return fallback;

  const prompt = [
    "Tu es un moteur cognitif métier appelé par le Brain de Clara OS.",
    "Le Brain de Clara reste l'autorité d'orchestration, de mission, de gouvernance et d'exécution.",
    "Ta responsabilité est de produire une compréhension opérationnelle profonde, structurée et directement exploitable.",
    "Tu ne décides pas d'autoriser une action et tu n'exécutes aucune capability.",
    "",
    "CONTEXTE MÉTIER DE CLARA",
    "Clara OS est spécialisée dans le spectacle vivant et l'événementiel.",
    "Elle doit raisonner comme une collaboratrice opérationnelle capable de comprendre la technique, la production et l'exploitation.",
    "Pour les sujets lumière, considère notamment lorsque c'est pertinent : préparation du show, plan de feu, patch, univers/adressage DMX, fixtures, groupes, palettes, cues, consoles, réseau, alimentation, sécurité, répétitions, exploitation, diagnostic et restitution de démonstration.",
    "Pour les sujets son ou production, applique le même niveau de profondeur métier adapté au domaine concerné.",
    "Ne réduis jamais une demande métier riche à une question générique de format, durée ou organisation si le contexte permet déjà de commencer un vrai travail opérationnel.",
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
    "RÈGLES DE RAISONNEMENT",
    "- intent doit être court, métier et orienté mission.",
    "- summary doit exprimer le résultat recherché et la valeur opérationnelle, pas paraphraser la demande.",
    "- actions doit former un plan de travail cohérent de bout en bout, généralement 3 à 7 étapes lorsque le sujet le justifie.",
    "- nextAction doit être l'action la plus utile à engager maintenant, pas une formalité générique.",
    "- Distingue les informations réellement bloquantes des simples préférences. Ne pose pas de question pour une préférence si tu peux avancer avec une hypothèse prudente ou proposer un cadre.",
    "- Lorsqu'un utilisateur fournit une information qui répond manifestement à l'étape courante d'une mission, intègre-la comme acquise dans ton raisonnement et fais progresser le plan vers l'étape utile suivante.",
    "- Ne répète pas une tâche déjà marquée [TERMINÉE].",
    "- Si une tâche [À FAIRE] est déjà satisfaite par le nouveau message utilisateur, ne la repropose pas comme nextAction.",
    "- Utilise les sources, mémoires et connaissances disponibles lorsqu'elles sont pertinentes ; ne les ignore pas au profit de conseils génériques.",
    "- Les capabilities disponibles sont du contexte : ne prétends jamais les avoir exécutées.",
    "- Ne prétends jamais qu'une console, un fichier, un service ou un connecteur a été utilisé si aucune exécution n'a eu lieu.",
    "- confidence, importance, urgency et impact doivent être compris entre 0 et 1.",
    "- Ne propose pas une réponse conversationnelle : la formulation utilisateur sera produite ensuite par une couche dédiée.",
    "- Ne crée pas de faits absents de la demande ou des sources. Tu peux cependant structurer un plan professionnel à partir de bonnes pratiques métier explicites.",
    "- Pour une demande de démonstration, pense en termes de preuves à montrer : ce que Clara doit comprendre, préparer, produire, assister et faire gagner à l'utilisateur.",
    "",
    `État du système : ${context.event.type}`,
    `Source : ${context.event.source}`,
    "",
    "Sources disponibles :",
    sourceSummary,
    "",
    "Capabilities Clara disponibles (information uniquement) :",
    capabilitiesSummary,
    "",
    "Mémoires pertinentes :",
    memorySummary,
    "",
    "Connaissances apprises par Clara :",
    learnedKnowledgeSummary,
    "",
    "État opérationnel de la mission :",
    activeMissionInput,
    "",
    "Entrée à analyser :",
    reasoningInput,
  ].join("\n");

  const result = await new OpenAIResponsesEngine().generate({
    prompt,
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
  });

  if (!result.success || !result.content.trim()) return fallback;

  try {
    const parsed = JSON.parse(result.content) as Partial<Understanding>;
    if (
      typeof parsed.intent !== "string" ||
      typeof parsed.summary !== "string" ||
      typeof parsed.confidence !== "number" ||
      !Array.isArray(parsed.entities) ||
      !parsed.entities.every((entity) => typeof entity === "string") ||
      !Array.isArray(parsed.actions) ||
      !parsed.actions.every((action) => typeof action === "string") ||
      typeof parsed.nextAction !== "string" ||
      typeof parsed.importance !== "number" ||
      typeof parsed.urgency !== "number" ||
      typeof parsed.impact !== "number"
    ) return fallback;

    return {
      missionId: activeMission?.id ?? taskCompletion?.mission?.id,
      intent: parsed.intent,
      summary: parsed.summary,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      entities: parsed.entities,
      actions: parsed.actions,
      nextAction: parsed.nextAction,
      importance: Math.max(0, Math.min(1, parsed.importance)),
      urgency: Math.max(0, Math.min(1, parsed.urgency)),
      impact: Math.max(0, Math.min(1, parsed.impact)),
    };
  } catch {
    return fallback;
  }
}
