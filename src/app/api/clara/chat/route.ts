import { NextResponse } from "next/server";

import { dispatchEvent } from "@/lib/core/event-bus";
import { getRuntime } from "@/lib/core/runtime";
import { EventType } from "@/types";

interface ChatRequest {
  message?: string;
}

/**
 * Clara chat is an interface to Clara's runtime, not a second cognitive
 * orchestrator. The Brain owns understanding, mission continuity,
 * prioritisation and recommendation. GPT is invoked inside the Brain as a
 * cognitive provider only.
 */
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
      payload: { message },
    };

    // One user request = one Clara/Brain cycle.
    const session = await dispatchEvent(
      getRuntime(),
      event,
    );

    const recommendation = session.recommendation;
    const mission = session.mission;

    // The conversational surface renders the result produced by Clara's
    // Brain. It deliberately does not instantiate CognitiveToolLoop or expose
    // capabilities directly to GPT.
    const responseMessage =
      recommendation?.summary ??
      mission?.nextAction ??
      "Clara a traité la demande mais n'a produit aucune recommandation.";

    return NextResponse.json({
      success: true,
      message: responseMessage,
      brain: {
        state: session.state,
        recommendation: recommendation
          ? {
              summary: recommendation.summary,
              rationale: recommendation.rationale,
            }
          : null,
        mission: mission
          ? {
              id: mission.id,
              title: mission.title,
              objective: mission.objective,
              status: mission.status,
              progress: mission.progress,
              nextAction: mission.nextAction,
            }
          : null,
      },
      // Capability approvals will be emitted by the Brain execution boundary,
      // not by the chat route. Keep the response contract stable for the UI.
      approvals: [],
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
