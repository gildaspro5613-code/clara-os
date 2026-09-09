/**
 * ============================================
 * CLARA OS — API
 * --------------------------------------------
 * File : /api/clara/chat/route.ts
 * Responsibility :
 * Clara conversational chat endpoint.
 * Routes every user message through Mission Resolver then Clara Core/Brain
 * before producing the conversational response.
 * ============================================
 */

import { NextRequest, NextResponse } from "next/server";

import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import { createUserMessageEvent, getRuntime } from "@/lib/core";
import { getClaraSystemPrompt } from "@/i18n/prompts";
import { resolveLocale } from "@/i18n/config";
import { resolveMission } from "@/modules/missions/mission-resolver";

type ClaraChatBody = {
  message?: unknown;
  locale?: unknown;
  conversationId?: unknown;
  missionId?: unknown;
};

/**
 * POST /api/clara/chat
 *
 * Body:
 *   { message: string; locale?: string; conversationId?: string; missionId?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ClaraChatBody;

  try {
    body = (await request.json()) as ClaraChatBody;
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

  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : undefined;

  const requestedMissionId =
    typeof body.missionId === "string" && body.missionId.trim()
      ? body.missionId.trim()
      : undefined;

  try {
    const missionResolution = await resolveMission({
      missionId: requestedMissionId,
      message,
    });

    const event = createUserMessageEvent({
      message,
      locale,
      conversationId,
      missionId: missionResolution.mission?.id,
      mission: missionResolution.mission,
      missionResolution: missionResolution.status,
    });

    await getRuntime().processEvent(event);

    const instructions = getClaraSystemPrompt(locale);
    const engine = new OpenAIResponsesEngine();

    const result = await engine.generate({
      prompt: message,
      instructions,
      model: "gpt-5.5",
    });

    return NextResponse.json({
      success: result.success,
      content: result.content,
      locale,
      conversationId,
      eventId: event.id,
      missionId: missionResolution.mission?.id,
      missionResolution: missionResolution.status,
      missionCandidates:
        missionResolution.status === "AMBIGUOUS"
          ? missionResolution.candidates?.map((mission) => ({
              id: mission.id,
              title: mission.title,
            }))
          : undefined,
      error: result.success ? undefined : result.message,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        content: "",
        locale,
        conversationId,
        error: err instanceof Error ? err.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
