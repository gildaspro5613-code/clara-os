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

  const instructions = getClaraSystemPrompt(locale);

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
