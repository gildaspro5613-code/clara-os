import { NextResponse } from "next/server";
import { readAuthCookie } from "@/lib/connectors/microsoft/security/request-authorization";
import { resolveSoleAuthenticatedWorkspace } from "@/lib/auth/sole-authenticated-workspace";
import { PostgresPhysicalActionProposalStore } from "@/lib/connectors/clara-live/postgres-physical-action-store";

import { composeClaraResponseWithProposal } from "@/lib/brain/response-composer";
import { buildExecutionPlan } from "@/lib/brain/planners";
import { toPhysicalActionProposalView } from "@/lib/clara/physical-action-view";
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
    const composed = await composeClaraResponseWithProposal(message, session);
    const responseMessage = composed.content;
    const executionPlan = recommendation?.decision
      ? buildExecutionPlan(recommendation.decision, "fr", composed.physicalAction)
      : { tasks: [], physicalActions: [] };

    if (executionPlan.physicalActions.length > 0) {
      const token = readAuthCookie(request.headers.get("cookie"));
      const principal = await resolveSoleAuthenticatedWorkspace(token, "connections:manage");
      if (!principal) {
        return NextResponse.json(
          { success: false, message: "Authenticated operator workspace required for physical action proposals." },
          { status: 401 },
        );
      }
      const conversationId = "clara-default-conversation";
      const store = new PostgresPhysicalActionProposalStore(principal.workspaceId);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      for (const action of executionPlan.physicalActions) {
        await store.create({
          ...action,
          ownerId: principal.userId,
          conversationId,
          expiresAt,
        });
      }
    }

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
        physicalActions: executionPlan.physicalActions.map(toPhysicalActionProposalView),
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
