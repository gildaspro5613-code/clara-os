import { NextResponse } from "next/server";
import {
  applyAcquisitionOperatorDecision,
  type AcquisitionOperatorDecision,
} from "@/lib/acquisition/operator-decision";

const allowed = new Set<AcquisitionOperatorDecision>([
  "approve-specialist",
  "approve-opportunity",
  "defer",
  "reject",
]);

function workspaceId(request: Request): string {
  return request.headers.get("x-clara-workspace")?.trim()
    || process.env.CLARA_WORKSPACE_ID?.trim()
    || "melodie-digital";
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ success: false, message: "Origine de décision non autorisée." }, { status: 403 });
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
      workspaceId: workspaceId(request),
      submissionId: body.submissionId.trim(),
      decision: body.decision as AcquisitionOperatorDecision,
    });

    if (!result) {
      return NextResponse.json({ success: false, message: "Dossier d'acquisition introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      submissionId: result.record.submissionId,
      lifecycle: result.record.lifecycle,
      resumed: result.resumed,
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
