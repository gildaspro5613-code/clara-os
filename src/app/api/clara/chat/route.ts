import { NextResponse } from "next/server";

import { dispatchEvent } from "@/lib/core/event-bus";
import { loadSession } from "@/lib/core/store/session-store";
import { EventType } from "@/types";
import { CognitiveToolLoop } from "@/lib/brain/cognitive-tool-loop";

interface ChatRequest {
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();

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

    const session = await dispatchEvent(event);

    const sourcesSummary = session.sources.length > 0
      ? session.sources
          .map((source) => source.summary)
          .join("\n\n")
      : "Aucune source externe chargée.";

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
      "Ne prétends jamais avoir effectué une action qui ne l'a pas été.",
      "Si tu ne sais pas quelque chose, dis-le simplement.",
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
      "Message de Gildas :",
      message,
    ].join("\\n");

    const toolLoop = new CognitiveToolLoop();

    const result = await toolLoop.execute({
      prompt,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.content,
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
