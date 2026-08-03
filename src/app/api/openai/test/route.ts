import { NextResponse } from "next/server";

import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";

/**
 * Test endpoint.
 */
export async function GET() {

  const engine = new OpenAIResponsesEngine();

  const result = await engine.generate({

    prompt: "Présente-toi en une phrase. Tu es Clara OS.",

    model: "gpt-5.5",

  });

  return NextResponse.json(result);

}