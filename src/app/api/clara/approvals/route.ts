import { NextResponse } from "next/server";
import { CapabilityToolBridge } from "@/lib/capabilities/capability-tool-bridge";
import { DatabaseToolApprovalRepository } from "@/lib/capabilities/tool-approval-repository";
import type { ClaraPlan } from "@/lib/capabilities/capability-policy";
import { readAuthCookie } from "@/lib/connectors/microsoft/security/request-authorization";
import { resolveSoleAuthenticatedWorkspace } from "@/lib/auth/sole-authenticated-workspace";
import {
  COMMERCIAL_EMAIL_SEND_CAPABILITY,
  COMMERCIAL_TRANSPORT_NOT_CONFIGURED,
  markCommercialDraftStatus,
  parseCommercialSendContext,
  type CommercialSendContext,
} from "@/lib/acquisition/commercial-communication-service";
import { loadSession, saveSession } from "@/lib/core/store/session-store";
import { loadMission, saveMission } from "@/modules/missions/mission-store";
import { Journal } from "@/lib/core/journal";
import { writeActionEntry } from "@/lib/core/journal-writer";

async function principal(request: Request) {
  const authenticated = await resolveSoleAuthenticatedWorkspace(
    readAuthCookie(request.headers.get("cookie")),
    "connections:manage",
  );
  if (!authenticated) return null;
  const configured = process.env.CLARA_PLAN;
  const plan: ClaraPlan = configured === "essential" || configured === "pro"
    ? configured
    : "premium";
  return {
    actorId: authenticated.userId,
    workspaceId: authenticated.workspaceId,
    plan,
  };
}

function commercialContext(capabilityId: string, argumentsJson: string): CommercialSendContext | null {
  if (capabilityId !== COMMERCIAL_EMAIL_SEND_CAPABILITY) return null;
  try {
    return parseCommercialSendContext(JSON.parse(argumentsJson));
  } catch {
    return null;
  }
}

function capabilityOutcome(content?: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { code?: unknown };
    return typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

async function recordCommercialOutcome(
  context: CommercialSendContext,
  message: string,
  outcome: "transport-blocked" | "rejected" | "failed",
): Promise<void> {
  const session = await loadSession(context.sessionKey);
  if (context.missionId && session.mission?.id !== context.missionId) {
    throw new Error("Commercial approval session no longer owns the validated mission.");
  }
  session.conversation = [...session.conversation, {
    id: crypto.randomUUID(),
    role: "clara" as const,
    content: message,
    createdAt: new Date().toISOString(),
  }].slice(-100);
  session.updatedAt = new Date();
  await saveSession(session, context.sessionKey);

  if (context.missionId) {
    const mission = await loadMission(context.missionId);
    if (mission) {
      mission.lastAction = outcome === "transport-blocked"
        ? "Validation de la communication commerciale"
        : outcome === "rejected"
          ? "Refus de la communication commerciale"
          : "Échec de la validation commerciale";
      if (outcome === "transport-blocked") {
        mission.nextAction = "Configurer le transport commercial IONOS pour clara@melodie.digital.";
        mission.status = "blocked";
      } else if (outcome === "rejected") {
        mission.nextAction = "Réviser la communication commerciale si nécessaire.";
      } else {
        mission.nextAction = "Revoir le brouillon commercial et demander une nouvelle validation.";
      }
      await saveMission(mission);
    }
  }
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

    const actor = await principal(request);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Session Clara non autorisée." }, { status: 401 });
    }
    const repository = new DatabaseToolApprovalRepository();

    if (body.decision === "reject") {
      const rejected = await repository.reject(body.id, body.token, actor);
      const parsedContext = rejected ? commercialContext(rejected.capabilityId, rejected.arguments) : null;
      const context = parsedContext?.workspaceId === actor.workspaceId ? parsedContext : null;
      if (context) {
        await markCommercialDraftStatus({ workspaceId: actor.workspaceId, submissionId: context.submissionId, status: "rejected" });
        const message = "La communication commerciale a été refusée. Aucun e-mail n’a été envoyé.";
        await recordCommercialOutcome(context, message, "rejected");
        await new Journal().addEntry(writeActionEntry("Communication commerciale refusée", `Dossier ${context.submissionId} · aucun envoi.`));
      } else if (rejected) {
        await new Journal().addEntry(writeActionEntry(
          "Action refusée",
          `${rejected.capabilityId} · aucune exécution.`,
        ));
      }
      return NextResponse.json(
        { success: Boolean(rejected), message: rejected ? "Action refusée." : "Cette autorisation n’est plus valide." },
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

    const parsedContext = commercialContext(approval.capabilityId, approval.arguments);
    const context = parsedContext?.workspaceId === actor.workspaceId ? parsedContext : null;
    const expectedCommercialBoundary = Boolean(context) &&
      capabilityOutcome(result.content) === COMMERCIAL_TRANSPORT_NOT_CONFIGURED;
    if (context) {
      await recordCommercialOutcome(
        context,
        result.message,
        expectedCommercialBoundary ? "transport-blocked" : "failed",
      );
      await new Journal().addEntry(writeActionEntry(
        result.success ? "Communication commerciale exécutée" : "Communication commerciale bloquée",
        `Dossier ${context.submissionId} · ${result.message}`,
      ));
    } else {
      await new Journal().addEntry(writeActionEntry(
        result.success ? "Action approuvée et exécutée" : "Action approuvée mais échouée",
        `${approval.capabilityId} · ${result.message}`,
      ));
    }

    return NextResponse.json({
      // The approval request was processed successfully even though the
      // deliberately unavailable transport remained fail-closed.
      success: result.success || expectedCommercialBoundary,
      executionSucceeded: result.success,
      outcome: capabilityOutcome(result.content),
      message: result.message,
      content: result.content,
      capabilityId: result.capabilityId,
    }, { status: result.success || expectedCommercialBoundary ? 200 : 502 });
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
