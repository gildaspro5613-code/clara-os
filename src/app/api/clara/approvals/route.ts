import { NextResponse } from "next/server";
import { CapabilityToolBridge } from "@/lib/capabilities/capability-tool-bridge";
import { DatabaseToolApprovalRepository } from "@/lib/capabilities/tool-approval-repository";
import type { ClaraPlan } from "@/lib/capabilities/capability-policy";

function principal() {
  const configured = process.env.CLARA_PLAN;
  const plan: ClaraPlan = configured === "essential" || configured === "pro"
    ? configured
    : "premium";
  return {
    actorId: process.env.CLARA_ACTOR_ID ?? "owner",
    workspaceId: process.env.CLARA_WORKSPACE_ID ?? "melodie-digital",
    plan,
  };
}

export async function POST(request: Request) {
  let processingApprovalId: string | undefined;
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ success: false, message: "Origine de validation non autorisée." }, { status: 403 });
    }

    const body = await request.json() as { id?: unknown; token?: unknown; decision?: unknown };
    if (typeof body.id !== "string" || typeof body.token !== "string") {
      return NextResponse.json({ success: false, message: "Autorisation invalide." }, { status: 400 });
    }

    const actor = principal();
    const repository = new DatabaseToolApprovalRepository();

    if (body.decision === "reject") {
      const rejected = await repository.reject(body.id, body.token, actor);
      return NextResponse.json(
        { success: rejected, message: rejected ? "Action refusée." : "Cette autorisation n’est plus valide." },
        { status: rejected ? 200 : 409 },
      );
    }

    const approval = await repository.consume(body.id, body.token, actor);
    if (!approval) {
      return NextResponse.json(
        { success: false, message: "Cette autorisation a expiré ou a déjà été utilisée." },
        { status: 409 },
      );
    }
    processingApprovalId = approval.id;

    const bridge = new CapabilityToolBridge();
    const result = await bridge.execute(
      { callId: approval.callId, name: approval.capabilityId, arguments: approval.arguments },
      { ...actor, approvedCapabilityIds: [approval.capabilityId] },
    );
    await repository.complete(approval.id, result.success);
    processingApprovalId = undefined;

    return NextResponse.json({
      success: result.success,
      message: result.message,
      content: result.content,
      capabilityId: result.capabilityId,
    }, { status: result.success ? 200 : 502 });
  } catch (error) {
    if (processingApprovalId) {
      await new DatabaseToolApprovalRepository()
        .complete(processingApprovalId, false)
        .catch(() => undefined);
    }
    console.error("[API /clara/approvals]", error);
    return NextResponse.json(
      { success: false, message: "Impossible de traiter cette autorisation." },
      { status: 500 },
    );
  }
}
