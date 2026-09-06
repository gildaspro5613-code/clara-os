import { NextResponse } from "next/server";

import { composeClaraResponse } from "@/lib/brain/response-composer";
import { dispatchEvent } from "@/lib/core/event-bus";
import { getRuntime } from "@/lib/core/runtime";
import {
  loadSession,
  saveSession,
} from "@/lib/core/store/session-store";
import type { ClaraConversationMessage } from "@/lib/core/session";
import { EventType } from "@/types";

interface ChatRequest {
  message?: string;
}

const MAX_PERSISTED_MESSAGES = 100;
const MAX_REASONING_HISTORY = 16;

/**
 * Clara chat is an interface to Clara's runtime, not a second cognitive
 * orchestrator. The Brain owns understanding, mission continuity,
 * prioritisation and recommendation. GPT is invoked inside the Brain as a
 * cognitive provider only. A separate response composer may then express the
 * Brain result naturally, but it has no tools and no execution authority.
 *
 * Cockpit and /clara are two views over this same persisted conversation.
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

    const persistedBeforeCycle = await loadSession();
    const recentConversation = persistedBeforeCycle.conversation
      .slice(-MAX_REASONING_HISTORY)
      .map(({ role, content }) => ({ role, content }));

    const event = {
      id: crypto.randomUUID(),
      type: EventType.USER_MESSAGE,
      source: "CLARA_CHAT",
      timestamp: new Date(),
      payload: {
        message,
        userFirstName: persistedBeforeCycle.user.firstName,
        conversationHistory: recentConversation,
      },
    };

    // One user request = one Clara/Brain decision cycle.
    const session = await dispatchEvent(
      getRuntime(),
      event,
    );

    const recommendation = session.recommendation;
    const mission = session.mission;

    // The composer only gives Clara a conversational voice. It receives the
    // already-decided Brain/session state and cannot call Clara capabilities.
    const responseMessage = await composeClaraResponse(
      message,
      session,
    );

    const now = new Date().toISOString();
    const newMessages: ClaraConversationMessage[] = [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        role: "clara",
        content: responseMessage,
        createdAt: new Date().toISOString(),
      },
    ];

    session.conversation = [
      ...session.conversation,
      ...newMessages,
    ].slice(-MAX_PERSISTED_MESSAGES);
    session.updatedAt = new Date();
    await saveSession(session);

    return NextResponse.json({
      success: true,
      message: responseMessage,
      conversation: session.conversation,
      user: session.user,
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
      // not by the chat route or the response composer.
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
