import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { readAuthCookie } from "@/lib/connectors/microsoft/security/request-authorization";
import { resolveSoleAuthenticatedWorkspace } from "@/lib/auth/sole-authenticated-workspace";
import { PostgresPhysicalActionProposalStore } from "@/lib/connectors/clara-live/postgres-physical-action-store";

import {
  composeClaraResponseWithProposal,
  composeCommercialDraftRevision,
} from "@/lib/brain/response-composer";
import { buildExecutionPlan } from "@/lib/brain/planners";
import { toPhysicalActionProposalView } from "@/lib/clara/physical-action-view";
import { dispatchEvent } from "@/lib/core/event-bus";
import { Clara } from "@/lib/core/clara";
import { getRuntime } from "@/lib/core/runtime";
import {
  DEFAULT_SESSION_KEY,
  saveSession,
} from "@/lib/core/store/session-store";
import { resolveOperationalContext } from "@/lib/core/operational-context";
import type { ClaraConversationMessage } from "@/lib/core/session";
import { EventType } from "@/types";
import { CapabilityToolBridge } from "@/lib/capabilities/capability-tool-bridge";
import type { ClaraPlan } from "@/lib/capabilities/capability-policy";
import {
  classifyCommercialConversationIntent,
  createCommercialSendProposal,
  resolveCommercialDraft,
  reviseCommercialDraft,
} from "@/lib/acquisition/commercial-communication-service";
import { Journal } from "@/lib/core/journal";
import { writeActionEntry } from "@/lib/core/journal-writer";
import { saveMission } from "@/modules/missions/mission-store";

interface ChatRequest {
  message?: string;
}

const MAX_PERSISTED_MESSAGES = 100;
const MAX_REASONING_HISTORY = 16;

/**
 * Clara chat is an interface to Clara's runtime, not a second cognitive
 * orchestrator. The Brain owns understanding, mission continuity,
 * prioritisation and recommendation. GPT is invoked inside the Brain as a
 * cognitive provider only. A separate response composer may then express the
 * Brain result naturally, but it has no tools and no execution authority.
 *
 * Cockpit and /clara are two views over this same persisted conversation.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Message vide." },
        { status: 400 },
      );
    }

    const operational = await resolveOperationalContext();
    const persistedBeforeCycle = operational.session;
    const recentConversation = persistedBeforeCycle.conversation
      .slice(-MAX_REASONING_HISTORY)
      .map(({ role, content }) => ({ role, content }));

    const event = {
      id: crypto.randomUUID(),
      type: EventType.USER_MESSAGE,
      source: "CLARA_CHAT",
      timestamp: new Date(),
      payload: {
        message,
        userFirstName: persistedBeforeCycle.user.firstName,
        conversationHistory: recentConversation,
      },
      context: operational.acquisition
        ? {
            workspaceId: operational.acquisition.workspaceId,
            sessionId: operational.sessionKey,
            metadata: {
              acquisitionSubmissionId: operational.acquisition.submissionId,
            },
          }
        : undefined,
    };

    // One user request = one Clara/Brain decision cycle.
    const workspaceId = operational.acquisition?.workspaceId
      ?? (typeof persistedBeforeCycle.brainDashboard?.context.metadata?.workspaceId === "string"
        ? persistedBeforeCycle.brainDashboard.context.metadata.workspaceId
        : undefined);
    const clara = operational.sessionKey === DEFAULT_SESSION_KEY
      ? getRuntime()
      : new Clara(operational.sessionKey, workspaceId);
    const session = await dispatchEvent(clara, event);

    const recommendation = session.recommendation;
    const mission = session.mission;

    // The composer only gives Clara a conversational voice. It receives the
    // already-decided Brain/session state and cannot call Clara capabilities.
    const composed = await composeClaraResponseWithProposal(message, session);
    let responseMessage = composed.content;
    const executionPlan = recommendation?.decision
      ? buildExecutionPlan(recommendation.decision, "fr", composed.physicalAction)
      : { tasks: [], physicalActions: [] };

    let physicalConversationId: string | null = null;
    const approvals = [] as Array<{
      id: string;
      token: string;
      capabilityId: string;
      summary: string;
      expiresAt: string;
    }>;
    if (executionPlan.physicalActions.length > 0) {
      const token = readAuthCookie(request.headers.get("cookie"));
      const principal = await resolveSoleAuthenticatedWorkspace(token, "connections:manage");
      if (!principal) {
        return NextResponse.json(
          { success: false, message: "Authenticated operator workspace required for physical action proposals." },
          { status: 401 },
        );
      }
      const conversationId = `clara:${createHash("sha256").update(`${principal.workspaceId}:${principal.userId}`).digest("hex").slice(0, 32)}`;
      physicalConversationId = conversationId;
      const store = new PostgresPhysicalActionProposalStore(principal.workspaceId);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      for (const action of executionPlan.physicalActions) {
        await store.create({
          ...action,
          ownerId: principal.userId,
          conversationId,
          expiresAt,
        });
      }
    }

    if (operational.acquisition) {
      const commercialIntent = classifyCommercialConversationIntent(message);
      if (commercialIntent.kind === "revise") {
        const current = await resolveCommercialDraft(
          operational.acquisition.workspaceId,
          operational.acquisition.submissionId,
        );
        const revision = current
          ? await composeCommercialDraftRevision(
              commercialIntent.instruction,
              current.draft,
              session,
            )
          : null;
        const draft = revision
          ? await reviseCommercialDraft({
              workspaceId: operational.acquisition.workspaceId,
              submissionId: operational.acquisition.submissionId,
              ...revision,
            })
          : null;
        if (draft) {
          responseMessage = `J’ai mis à jour le même brouillon commercial (révision ${draft.revision}). Il reste en attente de validation et aucun e-mail n’a été envoyé.`;
          if (session.mission) {
            session.mission.lastAction = "Révision conversationnelle du brouillon commercial";
            session.mission.nextAction = "Valider la communication commerciale avec Clara.";
            await saveMission(session.mission);
          }
          await new Journal().addEntry(writeActionEntry(
            "Brouillon commercial révisé avec Clara",
            `Dossier ${draft.submissionId} · révision ${draft.revision}.`,
          ));
        } else {
          responseMessage = current
            ? "Je n’ai pas pu produire une révision fiable du brouillon. Je l’ai laissé inchangé et aucun e-mail n’a été envoyé."
            : "Je ne trouve aucun brouillon commercial dans le dossier courant. Aucun e-mail n’a été envoyé.";
        }
      } else if (commercialIntent.kind === "send-confirmation") {
        const token = readAuthCookie(request.headers.get("cookie"));
        const principal = await resolveSoleAuthenticatedWorkspace(token, "connections:manage");
        if (!principal || principal.workspaceId !== operational.acquisition.workspaceId) {
          return NextResponse.json(
            { success: false, message: "La validation commerciale exige la session opérateur du workspace propriétaire." },
            { status: 401 },
          );
        }
        const resolved = await resolveCommercialDraft(principal.workspaceId, operational.acquisition.submissionId);
        if (resolved) {
          const configuredPlan = process.env.CLARA_PLAN;
          const plan: ClaraPlan = configuredPlan === "essential" || configuredPlan === "pro"
            ? configuredPlan
            : "premium";
          const proposal = await createCommercialSendProposal({
            context: {
              workspaceId: principal.workspaceId,
              submissionId: resolved.draft.submissionId,
              sessionKey: operational.sessionKey,
              missionId: session.mission?.id,
              recipientEmail: resolved.draft.recipient.email,
              draftRevision: resolved.draft.revision,
            },
            principal: {
              actorId: principal.userId,
              workspaceId: principal.workspaceId,
              plan,
              approvedCapabilityIds: [],
            },
          }, new CapabilityToolBridge());
          if (proposal.approvalRequest) approvals.push(proposal.approvalRequest);
          responseMessage = proposal.approvalRequest
            ? `J’ai préparé la validation du brouillon destiné à ${resolved.draft.recipient.email}. Confirmez l’autorisation ci-dessous. Cela ne déclenchera aucun envoi tant que le transport IONOS clara@melodie.digital n’est pas configuré.`
            : proposal.message;
          if (proposal.approvalRequest && session.mission) {
            session.mission.lastAction = "Demande de validation de la communication commerciale";
            session.mission.nextAction = "Approuver ou refuser la communication préparée.";
            await saveMission(session.mission);
          }
          await new Journal().addEntry(writeActionEntry(
            "Validation commerciale demandée",
            `Dossier ${resolved.draft.submissionId} · destinataire ${resolved.draft.recipient.email} · aucun envoi.`,
          ));
        }
      }
    }

    const now = new Date().toISOString();
    const newMessages: ClaraConversationMessage[] = [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        role: "clara",
        content: responseMessage,
        createdAt: new Date().toISOString(),
      },
    ];

    session.conversation = [
      ...session.conversation,
      ...newMessages,
    ].slice(-MAX_PERSISTED_MESSAGES);
    session.updatedAt = new Date();
    await saveSession(session, operational.sessionKey);

    return NextResponse.json({
      success: true,
      message: responseMessage,
      conversation: session.conversation,
      user: session.user,
      brain: {
        state: session.state,
        recommendation: recommendation
          ? {
              summary: recommendation.summary,
              rationale: recommendation.rationale,
            }
          : null,
        physicalActions: executionPlan.physicalActions.map(toPhysicalActionProposalView),
        mission: mission
          ? {
              id: mission.id,
              title: mission.title,
              objective: mission.objective,
              status: mission.status,
              progress: mission.progress,
              nextAction: mission.nextAction,
            }
          : null,
      },
      // Capability approvals will be emitted by the Brain execution boundary,
      // not by the chat route or the response composer.
      approvals,
      physicalActions: executionPlan.physicalActions.map((action) => ({
        ...toPhysicalActionProposalView(action),
        conversationId: physicalConversationId,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la communication avec Clara.",
      },
      { status: 500 },
    );
  }
}
