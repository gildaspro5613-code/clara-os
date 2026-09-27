import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedOperator } from "@/lib/auth/authenticated-operator-session";
import { isSameOriginRequest } from "@/lib/auth/session-request-security";
import { PostgresPhysicalActionProposalStore } from "@/lib/connectors/clara-live/postgres-physical-action-store";
import { consumeApprovedPhysicalAction } from "@/lib/connectors/clara-live/physical-action-approval-service";

/**
 * Physical approval remains fail-closed until the proposal store is durable and
 * the route can atomically consume the exact stored proposal. Authentication is
 * now resolved from Clara OS's trusted server-side session only.
 */
export async function POST(request: NextRequest) {
  let body: { proposalId?: unknown; conversationId?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
  }
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

  const proposalId = typeof body.proposalId === "string" ? body.proposalId.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
  if (!proposalId || !conversationId) {
    return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const store = new PostgresPhysicalActionProposalStore(workspaceId);
    const authorized = await consumeApprovedPhysicalAction(
      store,
      { proposalId, approved: true, confirmedAt: new Date() },
      operator,
      { ownerId: operator.id, conversationId },
    );

    // Authorization is returned to the server-side orchestration boundary.
    // This HTTP route deliberately does not call ConnectorEngine or hardware.
    return NextResponse.json({
      success: true,
      authorization: {
        proposalId: authorized.id,
        status: authorized.status,
        authorizedAt: authorized.authorizedAt.toISOString(),
      },
      execution: { commandSent: false, physicalExecutionConfirmed: false },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { success: false, code: "PHYSICAL_ACTION_APPROVAL_DENIED" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
}
