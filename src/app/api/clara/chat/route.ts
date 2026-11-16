import {readGoogleDisplayName} from "@/lib/auth/google-display-name";
import {RegistryError} from '@/lib/canonical/registry';
import {nativeFailure} from '@/lib/native/authority';
import {nativeChatRequest,cancelNativeChat} from '@/lib/native/chat';
import {nativeContext} from "@/lib/native/scoped-context";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
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
import {prepareNativeCalendarChat,type NativeCalendarChatProposal} from "@/lib/native/calendar-chat-prepare";

interface ChatRequest {
  message?: string;
  operationId?: string;
}

// Active Session cache only. Migration 017 archives old/new messages atomically.
const ACTIVE_CONVERSATION_WINDOW = 100;
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
  return nativeChatRequest(request,()=>scopedChat(request));
}
async function scopedChat(request:Request) {

  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const ui = await getTranslations("ui");
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { success: false, message: ui("emptyMessage") },
        { status: 400 },
      );
    }

    const operational = await resolveOperationalContext();
    const native=nativeContext()!;
    native.authenticatedFirstName=readGoogleDisplayName(request.headers.get('cookie'),native.scope.digest);
    // Never promote a historical session default or a user-supplied name into identity.
    operational.session.user={firstName:native.authenticatedFirstName};
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
        ...(operational.acquisition?{selectedAcquisition:{submissionId:operational.acquisition.submissionId,contact:nativeContext()?.intakes.get(operational.acquisition.submissionId)?.contact,opportunity:operational.acquisition.qualification.opportunity}}:{}),
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

    const commercialIntent = operational.acquisition
      ? classifyCommercialConversationIntent(message)
      : { kind: "none" as const };

    if(nativeContext()&&commercialIntent.kind==='send-confirmation')return NextResponse.json({success:false,code:'NATIVE_COMMERCIAL_SEND_DISABLED'},{status:403,headers:{'Cache-Control':'no-store'}});

    // A commercial rewrite/send confirmation is a command inside the current
    // acquisition workflow, not a new operational objective. Handle it against
    // the durable draft before the generic Brain cycle so a phrase such as
    // "remplace cette version" cannot rename/re-plan the active mission.
    const isCommercialCommand =
      commercialIntent.kind === "revise" ||
      commercialIntent.kind === "send-confirmation";

    // One user request = one Clara/Brain decision cycle, except bounded
    // commercial commands which keep the existing mission/session unchanged.
    const workspaceId = nativeContext()?.scope.workspaceId ?? operational.acquisition?.workspaceId
      ?? (typeof persistedBeforeCycle.brainDashboard?.context.metadata?.workspaceId === "string"
        ? persistedBeforeCycle.brainDashboard.context.metadata.workspaceId
        : undefined);
    const clara = operational.sessionKey === DEFAULT_SESSION_KEY
      ? getRuntime()
      : new Clara(operational.sessionKey, workspaceId);
    const session = isCommercialCommand
      ? persistedBeforeCycle
      : await dispatchEvent(clara, event);

    const recommendation = session.recommendation;
    const mission = session.mission;

    // The composer only gives Clara a conversational voice. It receives the
    // already-decided Brain/session state and cannot call Clara capabilities.
    const composed = await composeClaraResponseWithProposal(message, session, locale);
    let responseMessage = composed.content;
    if (composed.generation.status !== "completed" && !isCommercialCommand) {
      const native=nativeContext();if(native)native.commitOnFailure=true;
      const at=new Date().toISOString();
      session.conversation=[...session.conversation,
        {id:crypto.randomUUID(),role:"user" as const,content:message,createdAt:at},
        {id:crypto.randomUUID(),role:"clara" as const,content:composed.content,createdAt:at,generation:composed.generation},
      ].slice(-ACTIVE_CONVERSATION_WINDOW);
      session.updatedAt=new Date();await saveSession(session,operational.sessionKey);
      return NextResponse.json({success:false,message:composed.content,generation:composed.generation,conversation:session.conversation},{status:502});
    }
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
    if(nativeContext()&&executionPlan.physicalActions.length>0)return NextResponse.json({success:false,code:"NATIVE_CAPABILITY_NOT_CERTIFIED"},{status:503});
    let nativeGoogleProposal:NativeCalendarChatProposal|null=null;
    if(nativeContext()&&!isCommercialCommand&&typeof body.operationId==='string'){
      const prepared=await prepareNativeCalendarChat(message,body.operationId,session);
      if(prepared.kind==='prepared'){
        nativeGoogleProposal=prepared.review;
        const detail=prepared.review.proposal;
        const date=new Intl.DateTimeFormat(locale,{dateStyle:'full',timeZone:'Europe/Paris'}).format(new Date(detail.start));
        const hour=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'});
        const display=detail.name+' · '+prepared.review.calendarName+' · '+date+' '+hour.format(new Date(detail.start))+'–'+hour.format(new Date(detail.end));
        const replies={
          fr:"C'est prêt à être validé : "+display+". Je n'ai encore rien créé dans Google. Vérifie les détails ci-dessous et donne ton accord si tout te convient.",
          en:"Ready for your review: "+display+". I haven't created anything in Google. Check the details below and confirm only if everything looks right.",
          es:"Ya está listo para tu revisión: "+display+". Todavía no he creado nada en Google. Comprueba los detalles y confirma solo si estás de acuerdo.",
          de:"Der Vorschlag ist zur Prüfung bereit: "+display+". In Google habe ich noch nichts erstellt. Prüfe die Angaben und bestätige nur, wenn alles stimmt.",
          it:"La proposta è pronta da verificare: "+display+". Non ho ancora creato nulla su Google. Controlla i dettagli e conferma solo se va tutto bene.",
        };
        responseMessage=replies[locale];
      }else if(prepared.kind==='unavailable'){
        const missingMission=prepared.code==='GOOGLE_MISSION_REQUIRED';
        const replies={
          fr:missingMission?"Je peux préparer ce rendez-vous, mais il faut d'abord une mission active dans ce projet. Rien n'a été créé.":"J'ai compris le rendez-vous, mais je ne retrouve pas un calendrier déjà autorisé pour ce projet. Je n'ai rien créé.",
          en:missingMission?"I can prepare this appointment once there is an active mission in this project. Nothing has been created.":"I understand the appointment, but I can't verify an authorized calendar for this project. Nothing has been created.",
          es:missingMission?"Puedo preparar la cita cuando haya una misión activa en este proyecto. No he creado nada.":"He entendido la cita, pero no encuentro un calendario autorizado para este proyecto. No he creado nada.",
          de:missingMission?"Ich kann den Termin vorbereiten, sobald in diesem Projekt eine Mission aktiv ist. Es wurde nichts erstellt.":"Ich habe den Termin verstanden, kann aber keinen autorisierten Kalender für dieses Projekt bestätigen. Es wurde nichts erstellt.",
          it:missingMission?"Posso preparare l'appuntamento quando ci sarà una missione attiva nel progetto. Non ho creato nulla.":"Ho capito l'appuntamento, ma non riesco a verificare un calendario autorizzato per questo progetto. Non ho creato nulla.",
        };
        responseMessage=replies[locale];
      }
    }
    if (executionPlan.physicalActions.length > 0) {
      const token = readAuthCookie(request.headers.get("cookie"));
      const principal = await resolveSoleAuthenticatedWorkspace(token, "connections:manage");
      if (!principal) {
        return NextResponse.json(
          { success: false, message: ui("operatorWorkspaceRequired") },
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
          responseMessage = ui("commercialDraftUpdated",{revision:draft.revision});
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
            ? ui("commercialRevisionFailed")
            : ui("commercialDraftMissing");
        }
      } else if (commercialIntent.kind === "send-confirmation") {
        const token = readAuthCookie(request.headers.get("cookie"));
        const principal = await resolveSoleAuthenticatedWorkspace(token, "connections:manage");
        if (!principal || principal.workspaceId !== operational.acquisition.workspaceId) {
          return NextResponse.json(
            { success: false, message: ui("commercialOperatorRequired") },
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
            ? ui("commercialApprovalPrepared",{recipient:resolved.draft.recipient.email})
            : ui("commercialApprovalUnavailable");
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
    ].slice(-ACTIVE_CONVERSATION_WINDOW);
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
      nativeGoogleProposal,
      physicalActions: executionPlan.physicalActions.map((action) => ({
        ...toPhysicalActionProposalView(action),
        conversationId: physicalConversationId,
      })),
    });
  } catch(error) {
    if(nativeContext()&&error instanceof RegistryError)return nativeFailure(error);
    return NextResponse.json(
      {
        success: false,
        message:
          ui("chatUnavailable"),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request:Request){return cancelNativeChat(request);}
