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
  let body: { message?: unknown; locale?: unknown };

  try {
    body = (await request.json()) as { message?: unknown; locale?: unknown };
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

  const locale = resolveLocale(
    typeof body.locale === "string" ? body.locale : null,
  );

  const brainEvent: Event = {
    id: crypto.randomUUID(),
    type: EventType.USER_MESSAGE,
    source: "clara-chat",
    timestamp: new Date(),
    payload: { message, locale },
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

Physical safety boundary: this conversational endpoint may understand and propose actions, but it cannot authorize or execute physical equipment commands. Explicit operator authorization must occur through Clara OS execution authority.`;

  const engine = new OpenAIResponsesEngine();

  try {
    const result = await engine.generate({
      prompt: message,
      instructions,
      model: "gpt-5.5",
    });

    return NextResponse.json({
      success: result.success,
      content: result.content,
      locale,
      brain: { decisionId: dashboard.decision.id, taskIds: dashboard.tasks.map((task) => task.id) },
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
