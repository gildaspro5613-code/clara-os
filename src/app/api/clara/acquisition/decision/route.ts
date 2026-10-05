import { NextResponse, type NextRequest } from "next/server";
import {
  applyAcquisitionOperatorDecision,
  type AcquisitionOperatorDecision,
} from "@/lib/acquisition/operator-decision";
import { resumeAcquisitionRuntime } from "@/lib/acquisition/resume-runtime";
import { isSameOriginRequest } from "@/lib/auth/session-request-security";
import { authorizeMicrosoftRequest } from "@/lib/connectors/microsoft/security/request-authorization";
import { Journal } from "@/lib/core/journal";
import { writeActionEntry } from "@/lib/core/journal-writer";

const allowed = new Set<AcquisitionOperatorDecision>([
  "approve-specialist",
  "approve-opportunity",
  "defer",
  "reject",
]);

function configuredWorkspaceId(): string | null {
  const workspaceId = process.env.CLARA_WORKSPACE_ID?.trim();
  return workspaceId && workspaceId !== "default" ? workspaceId : null;
}

export async function POST(request: NextRequest) {
  try {
    const configuredOrigin = process.env.CLARA_AUTH_APP_ORIGIN;
    if (!isSameOriginRequest(request.headers.get("origin"), configuredOrigin)) {
      return NextResponse.json({ success: false, message: "Origine de décision non autorisée." }, { status: 403 });
    }

    const workspaceId = configuredWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ success: false, message: "Workspace Clara non configuré." }, { status: 503 });
    }

    const principal = await authorizeMicrosoftRequest(
      request.headers.get("cookie"),
      workspaceId,
      "connections:manage",
    );
    if (!principal) {
      return NextResponse.json({ success: false, message: "Session Clara non autorisée." }, { status: 401 });
    }

    const body = await request.json() as {
      submissionId?: unknown;
      decision?: unknown;
    };

    if (
      typeof body.submissionId !== "string" ||
      !body.submissionId.trim() ||
      typeof body.decision !== "string" ||
      !allowed.has(body.decision as AcquisitionOperatorDecision)
    ) {
      return NextResponse.json({ success: false, message: "Décision d'acquisition invalide." }, { status: 400 });
    }

    const result = await applyAcquisitionOperatorDecision({
      workspaceId: principal.workspaceId,
      submissionId: body.submissionId.trim(),
      decision: body.decision as AcquisitionOperatorDecision,
    });

    if (!result) {
      return NextResponse.json({ success: false, message: "Dossier d'acquisition introuvable." }, { status: 404 });
    }

    const resumed = result.resumed
      ? await resumeAcquisitionRuntime(result.record)
      : false;
    await new Journal().addEntry(writeActionEntry(
      `Décision acquisition · ${body.decision}`,
      `Dossier ${result.record.submissionId} · reprise Runtime ${resumed ? "effectuée" : "non requise"}.`,
    ));

    return NextResponse.json({
      success: true,
      submissionId: result.record.submissionId,
      lifecycle: result.record.lifecycle,
      resumed,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Acquisition decision is not currently required.") {
      return NextResponse.json({ success: false, message: "Aucune décision n'est actuellement requise pour ce dossier." }, { status: 409 });
    }
    console.error("[API /clara/acquisition/decision]", error);
    return NextResponse.json(
      { success: false, message: "Impossible de traiter la décision d'acquisition." },
      { status: 500 },
    );
  }
}
