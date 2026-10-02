import { NextResponse, type NextRequest } from "next/server";
import { loadAcquisitionDecisionQueue } from "@/lib/acquisition/acquisition-store";
import { authorizeMicrosoftRequest } from "@/lib/connectors/microsoft/security/request-authorization";

export const dynamic = "force-dynamic";

function configuredWorkspaceId(): string | null {
  const workspaceId = process.env.CLARA_WORKSPACE_ID?.trim();
  return workspaceId && workspaceId !== "default" ? workspaceId : null;
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = configuredWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, decisions: [], message: "Workspace Clara non configuré." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const principal = await authorizeMicrosoftRequest(
      request.headers.get("cookie"),
      workspaceId,
      "connections:manage",
    );
    if (!principal) {
      return NextResponse.json(
        { success: false, decisions: [], message: "Session Clara non autorisée." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const decisions = await loadAcquisitionDecisionQueue(principal.workspaceId);
    return NextResponse.json({
      success: true,
      decisions: decisions.map((record) => ({
        submissionId: record.submissionId,
        qualification: record.qualification,
        decisionBrief: record.decisionBrief,
        lifecycle: record.lifecycle,
        updatedAt: record.updatedAt.toISOString(),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[API /clara/acquisition/decisions]", error);
    return NextResponse.json(
      { success: false, decisions: [], message: "Impossible de charger les décisions d'acquisition." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
