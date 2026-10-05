import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginRequest } from "@/lib/auth/session-request-security";
import { authorizeMicrosoftRequest } from "@/lib/connectors/microsoft/security/request-authorization";
import { updateCommercialDraft } from "@/lib/acquisition/commercial-communication-service";
import { Journal } from "@/lib/core/journal";
import { writeActionEntry } from "@/lib/core/journal-writer";
import { resolveOperationalContext } from "@/lib/core/operational-context";
import { saveSession } from "@/lib/core/store/session-store";
import { saveMission } from "@/modules/missions/mission-store";

function configuredWorkspaceId(): string | null {
  const workspaceId = process.env.CLARA_WORKSPACE_ID?.trim()
    || process.env.CLARA_MD_WORKSPACE_ID?.trim();
  return workspaceId && workspaceId !== "default" ? workspaceId : null;
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request.headers.get("origin"), process.env.CLARA_AUTH_APP_ORIGIN)) {
      return NextResponse.json({ success: false, message: "Origine non autorisée." }, { status: 403 });
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
      subject?: unknown;
      body?: unknown;
    };
    if (
      typeof body.submissionId !== "string" || !body.submissionId.trim() ||
      typeof body.subject !== "string" || !body.subject.trim() || body.subject.length > 500 ||
      typeof body.body !== "string" || !body.body.trim() || body.body.length > 50_000
    ) {
      return NextResponse.json({ success: false, message: "Brouillon commercial invalide." }, { status: 400 });
    }
    const draft = await updateCommercialDraft({
      workspaceId: principal.workspaceId,
      submissionId: body.submissionId.trim(),
      subject: body.subject,
      body: body.body,
    });
    if (!draft) {
      return NextResponse.json({ success: false, message: "Brouillon commercial introuvable." }, { status: 404 });
    }
    const operational = await resolveOperationalContext();
    let conversation = operational.session.conversation;
    if (
      operational.acquisition?.workspaceId === principal.workspaceId &&
      operational.acquisition.submissionId === draft.submissionId
    ) {
      const message = `Le brouillon commercial a été enregistré (révision ${draft.revision}). Il doit être validé de nouveau et aucun e-mail n’a été envoyé.`;
      conversation = [...conversation, {
        id: crypto.randomUUID(),
        role: "clara" as const,
        content: message,
        createdAt: new Date().toISOString(),
      }].slice(-100);
      operational.session.conversation = conversation;
      operational.session.updatedAt = new Date();

      if (operational.session.mission) {
        operational.session.mission.lastAction = "Modification du brouillon commercial";
        operational.session.mission.nextAction = "Valider la communication commerciale avec Clara.";
        await saveMission(operational.session.mission);
      }
      await saveSession(operational.session, operational.sessionKey);
    }
    await new Journal().addEntry(writeActionEntry(
      "Brouillon commercial modifié",
      `Dossier ${draft.submissionId} · révision ${draft.revision} · validation de nouveau requise.`,
    ));
    return NextResponse.json({ success: true, draft, conversation });
  } catch (error) {
    console.error("[API commercial draft]", error);
    return NextResponse.json({ success: false, message: "Impossible de modifier le brouillon commercial." }, { status: 500 });
  }
}
