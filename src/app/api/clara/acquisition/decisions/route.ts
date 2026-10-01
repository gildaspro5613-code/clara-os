import { NextResponse } from "next/server";
import { loadAcquisitionDecisionQueue } from "@/lib/acquisition/acquisition-store";

export const dynamic = "force-dynamic";

function workspaceId(request: Request): string {
  return request.headers.get("x-clara-workspace")?.trim()
    || process.env.CLARA_WORKSPACE_ID?.trim()
    || "melodie-digital";
}

export async function GET(request: Request) {
  try {
    const decisions = await loadAcquisitionDecisionQueue(workspaceId(request));
    return NextResponse.json({
      success: true,
      decisions: decisions.map((record) => ({
        submissionId: record.submissionId,
        qualification: record.qualification,
        decisionBrief: record.decisionBrief,
        lifecycle: record.lifecycle,
        updatedAt: record.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[API /clara/acquisition/decisions]", error);
    return NextResponse.json(
      { success: false, decisions: [], message: "Impossible de charger les décisions d'acquisition." },
      { status: 500 },
    );
  }
}
