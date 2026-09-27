/**
 * ============================================
 * CLARA OS — API
 * --------------------------------------------
 * File : /api/clara/chat/route.ts
 * Responsibility :
 * Clara conversational chat endpoint.
 * Receives the user message and the active locale,
 * builds the localised system prompt, and returns
 * Clara's response via OpenAI.
 * ============================================
 */

import { NextRequest, NextResponse } from "next/server";

import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import { getClaraSystemPrompt } from "@/i18n/prompts";
import { resolveLocale } from "@/i18n/config";
import { runBrainDashboard } from "@/lib/brain";
import { EventType, type Event } from "@/types";
import { buildExecutionPlan } from "@/lib/brain/planners";
import {
  extractPhysicalActionProposal,
  PHYSICAL_ACTION_PROPOSAL_INSTRUCTIONS,
} from "@/lib/clara/physical-action-proposal";

/**
 * POST /api/clara/chat
 *
 * Body:
 *   { message: string; locale?: string }
 *
 * Returns:
 *   { content: string; success: boolean; locale: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { message?: unknown; locale?: unknown; conversationId?: unknown };

  try {
    body = (await request.json()) as { message?: unknown; locale?: unknown; conversationId?: unknown };
  } catch {
    return NextResponse.json(
      { success: false, content: "", error: "Invalid request body." },
      { status: 400 },
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json(
      { success: false, content: "", error: "message is required." },
      { status: 400 },
    );
  }

  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : crypto.randomUUID();

  const locale = resolveLocale(
    typeof body.locale === "string" ? body.locale : null,
  );

  const brainEvent: Event = {
    id: crypto.randomUUID(),
    type: EventType.USER_MESSAGE,
    source: "clara-chat",
    timestamp: new Date(),
    payload: { message, locale, conversationId },
  };

  // Every conversational turn now enters the canonical Brain pipeline before
  // language generation. The Brain may plan/propose, but this route has no
  // physical authorization or Connector Runtime execution capability.
  const dashboard = runBrainDashboard(brainEvent);

  const instructions = `${getClaraSystemPrompt(locale)}

## Current Brain context
Intent: ${dashboard.understanding.intent}
Summary: ${dashboard.understanding.summary}
Decision: ${dashboard.decision.summary}

Physical safety boundary: this conversational endpoint may understand and propose actions, but it cannot authorize or execute physical equipment commands. Explicit operator authorization must occur through Clara OS execution authority.\n\n${PHYSICAL_ACTION_PROPOSAL_INSTRUCTIONS}`;

  const engine = new OpenAIResponsesEngine();

  try {
    const result = await engine.generate({
      prompt: message,
      instructions,
      model: "gpt-5.5",
    });

    const extracted = result.success
      ? extractPhysicalActionProposal(result.content)
      : { content: result.content };

    const executionPlan = extracted.proposal
      ? buildExecutionPlan(dashboard.decision, extracted.proposal)
      : { tasks: dashboard.tasks, physicalActions: [] };

    return NextResponse.json({
      success: result.success,
      content: extracted.content,
      locale,
      conversationId,
      brain: {
        decisionId: dashboard.decision.id,
        taskIds: executionPlan.tasks.map((task) => task.id),
        physicalActions: executionPlan.physicalActions.map((action) => ({
          id: action.id,
          status: action.status,
          connector: action.connector,
          capability: action.capability,
          parameters: action.parameters,
          sessionId: action.sessionId,
        })),
      },
      error: result.success ? undefined : result.message,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        content: "",
        locale,
        error: err instanceof Error ? err.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
