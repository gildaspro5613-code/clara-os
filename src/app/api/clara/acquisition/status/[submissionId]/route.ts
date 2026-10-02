import { NextResponse, type NextRequest } from "next/server";

import { acquisitionE2EStatus } from "@/lib/acquisition/e2e-status";
import { loadAcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import { acquisitionSessionKey } from "@/lib/acquisition/resume-runtime";
import { authorizeMicrosoftRequest } from "@/lib/connectors/microsoft/security/request-authorization";
import { loadSession } from "@/lib/core/store/session-store";

export const dynamic = "force-dynamic";

function configuredWorkspaceId(): string | null {
  const workspaceId = process.env.CLARA_WORKSPACE_ID?.trim();
  return workspaceId && workspaceId !== "default" ? workspaceId : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ submissionId: string }> },
) {
  try {
    const workspaceId = configuredWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Workspace Clara non configuré." },
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
        { success: false, message: "Session Clara non autorisée." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { submissionId } = await context.params;
    const normalizedSubmissionId = submissionId.trim();
    if (!normalizedSubmissionId) {
      return NextResponse.json(
        { success: false, message: "Submission ID invalide." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const record = await loadAcquisitionRecord(
      principal.workspaceId,
      normalizedSubmissionId,
    );
    if (!record) {
      return NextResponse.json(
        { success: false, message: "Dossier d'acquisition introuvable." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const session = await loadSession(acquisitionSessionKey(record));

    return NextResponse.json(
      { success: true, status: acquisitionE2EStatus(record, session) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[API /clara/acquisition/status/:submissionId]", error);
    return NextResponse.json(
      { success: false, message: "Impossible de charger l'état du dossier d'acquisition." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
