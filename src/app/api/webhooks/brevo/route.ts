import { NextResponse } from "next/server";
import { parseBrevoWebhook } from "@/lib/connectors/brevo/webhook";
import { recordBrevoEvent } from "@/lib/connectors/brevo/event-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.BREVO_WEBHOOK_TOKEN;
  if (!expected) return false;
  const url = new URL(request.url);
  const supplied = request.headers.get("x-clara-webhook-token") ?? url.searchParams.get("token");
  return supplied === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const event = parseBrevoWebhook(payload);
  if (!event) return NextResponse.json({ accepted: false, reason: "Unsupported Brevo event." }, { status: 202 });
  await recordBrevoEvent(CURRENT_WORKSPACE_ID, event);
  return NextResponse.json({ accepted: true });
}
