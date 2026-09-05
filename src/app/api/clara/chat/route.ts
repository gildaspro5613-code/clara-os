import { NextResponse } from "next/server";

import { dispatchEvent } from "@/lib/core/event-bus";
import { getRuntime } from "@/lib/core/runtime";
import { EventType } from "@/types";
import { CognitiveToolLoop } from "@/lib/brain/cognitive-tool-loop";
import { ConnectionStatus } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";

interface ChatHistoryMessage {
  role: "user" | "clara";
  content: string;
}

interface ChatRequest {
  message?: string;
  history?: ChatHistoryMessage[];
}

function getPlan(): "essential" | "pro" | "premium" {
  const plan = process.env.CLARA_PLAN;
  return plan === "essential" || plan === "pro" ? plan : "premium";
}

function normalizeHistory(history: ChatHistoryMessage[] | undefined): ChatHistoryMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item): item is ChatHistoryMessage =>
        Boolean(item) &&
        (item.role === "user" || item.role === "clara") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 4000),
    }));
}

function isGoogleIntent(message: string, history: ChatHistoryMessage[]): boolean {
  const context = [
    ...history.map((item) => item.content),
    message,
  ].join(" ");

  return /\b(gmail|google|e-?mail|mail|drive|agenda|calendar|sheet|sheets|document|docs)\b/i.test(context);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();
    const history = normalizeHistory(body.history);

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Message vide." },
        { status: 400 },
      );
    }

    const event = {
      id: crypto.randomUUID(),
      type: EventType.USER_MESSAGE,
      source: "CLARA_CHAT",
      timestamp: new Date(),
      payload: {
        message,
      },
    };

    const session = await dispatchEvent(
      getRuntime(),
      event,
    );

    const sourcesSummary = session.sources.length > 0
      ? session.sources
          .map((source) => source.summary)
          .join("\n\n")
      : "Aucune source externe chargée.";

    const conversationSummary = history.length > 0
      ? history
          .map((item) => `${item.role === "user" ? "Gildas" : "Clara"} : ${item.content}`)
          .join("\n")
      : "Aucun échange précédent dans cette conversation.";

    const prompt = [
      "Tu es Clara.",
      "",
      "Tu es l'assistante IA de Gildas et l'interface intelligente de Clara OS.",
      "",
      "Tu tutoies toujours Gildas.",
      "",
      "Tu es naturelle, chaleureuse, élégante, intelligente et rassurante.",
      "Tu parles simplement, avec fluidité et sans formalisme artificiel.",
      "Tu peux être spontanée, complice et légèrement malicieuse lorsque le contexte s'y prête.",
      "",
      "Tu n'es pas une commerciale.",
      "Tu n'es pas un service client.",
      "Tu n'es pas une interface technique.",
      "",
      "Tu accompagnes Gildas dans son travail, ses décisions, ses projets et ses actions.",
      "Tu connais le contexte de Clara OS et tu l'accompagnes comme une véritable assistante opérationnelle.",
      "",
      "Privilégie des réponses naturelles, courtes et utiles.",
      "Ne répète pas inutilement ce que Gildas vient de dire.",
      "Ne commence pas par une structure technique ou bureaucratique.",
      "Tu n'as pas besoin de rappeler qui tu es à chaque réponse.",
      "",
      "Tu peux proposer directement la prochaine action utile lorsque le contexte le permet.",
      "Si une information manque réellement, pose une seule question ciblée.",
      "Interprète toujours le message courant dans la continuité des échanges précédents.",
      "Une adresse email donnée après une demande d'envoi complète naturellement le destinataire de cette demande.",
      "Ne prétends jamais avoir effectué une action qui ne l'a pas été.",
      "Si tu ne sais pas quelque chose, dis-le simplement.",
      "",
      "Conversation récente :",
      conversationSummary,
      "",
      "Contexte opérationnel disponible :",
      `État actuel : ${session.state}`,
      `Mission actuelle : ${session.mission?.title ?? "Aucune mission active"}`,
      `Objectif actuel : ${session.mission?.objective ?? "Aucun objectif actif"}`,
      `Prochaine action connue : ${session.mission?.nextAction ?? "Aucune action suivante définie"}`,
      `Recommandation du Brain : ${session.recommendation?.summary ?? "Aucune recommandation produite"}`,
      `Justification éventuelle : ${session.recommendation?.rationale ?? "Aucune justification disponible"}`,
      "",
      "Sources externes disponibles :",
      sourcesSummary,
      "",
      "Règles concernant les sources externes :",
      "- Si une source pertinente est disponible, utilise ses données réelles.",
      "- N'invente jamais une donnée absente des sources.",
      "- Si une source est indisponible, dis-le simplement et naturellement.",
      "",
      "Message courant de Gildas :",
      message,
    ].join("\n");

    const toolLoop = new CognitiveToolLoop();

    const result = await toolLoop.execute({
      prompt,
      principal: {
        actorId: process.env.CLARA_ACTOR_ID ?? "owner",
        workspaceId: CURRENT_WORKSPACE_ID,
        plan: getPlan(),
        // Fail closed until Clara's authenticated approval UI issues
        // server-verified, single-use approvals.
        approvedCapabilityIds: [],
      },
    });

    const requiredConnections = new Set(result.requiredConnections ?? []);

    // Some Google failures are discovered by runtime/source loading before a
    // model tool call is executed. In that case the connection repository is
    // the source of truth for the UI reconnect action.
    if (isGoogleIntent(message, history)) {
      const googleConnection = await new DatabaseConnectionRepository()
        .findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "google");

      if (
        googleConnection?.status === ConnectionStatus.RECONNECT_REQUIRED ||
        googleConnection?.status === ConnectionStatus.PENDING_AUTHENTICATION
      ) {
        requiredConnections.add("google");
      }
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          requiredConnections: [...requiredConnections],
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.content,
      approvals: result.approvalRequests ?? [],
      requiredConnections: [...requiredConnections],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la communication avec Clara.",
      },
      { status: 500 },
    );
  }
}
