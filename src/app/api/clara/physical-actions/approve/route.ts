import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedOperator } from "@/lib/auth/authenticated-operator-session";
import { isSameOriginRequest } from "@/lib/auth/session-request-security";

/**
 * Physical approval remains fail-closed until the proposal store is durable and
 * the route can atomically consume the exact stored proposal. Authentication is
 * now resolved from Clara OS's trusted server-side session only.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request.headers.get("origin"), process.env.CLARA_AUTH_APP_ORIGIN)) {
    return NextResponse.json(
      { success: false, code: "ORIGIN_DENIED" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const workspaceId = process.env.CLARA_AUTH_WORKSPACE_ID?.trim();
  if (!workspaceId || workspaceId === "default") {
    return NextResponse.json(
      { success: false, code: "AUTHENTICATED_OPERATOR_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const operator = await resolveAuthenticatedOperator(
    request.headers.get("cookie"),
    workspaceId,
  );
  if (!operator) {
    return NextResponse.json(
      { success: false, code: "AUTHENTICATED_OPERATOR_REQUIRED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Identity is now trustworthy, but execution stays closed until proposals
  // are persisted in a durable atomic store rather than process memory.
  return NextResponse.json(
    {
      success: false,
      code: "DURABLE_PHYSICAL_ACTION_STORE_REQUIRED",
      error: "Authenticated operator resolved; durable one-shot proposal storage is required before execution can be enabled.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
