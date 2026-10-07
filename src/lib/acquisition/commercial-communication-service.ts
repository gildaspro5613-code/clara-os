import type { CapabilityExecutionPrincipal } from "@/lib/capabilities/capability-policy";
import type { ToolApprovalRequest } from "@/lib/capabilities/tool-approval-repository";
import type { AcquisitionRecord } from "./acquisition-store";
import {
  buildCommercialQualificationDraft,
  type CommercialCommunicationDraft,
} from "./commercial-communication-draft";

export const COMMERCIAL_EMAIL_SEND_CAPABILITY = "commercial-email.send";
export const COMMERCIAL_TRANSPORT_NOT_CONFIGURED = "transport-not-configured";

export interface CommercialDraftRepository {
  load(workspaceId: string, submissionId: string): Promise<AcquisitionRecord | null>;
  save(
    workspaceId: string,
    submissionId: string,
    draft: CommercialCommunicationDraft,
  ): Promise<CommercialCommunicationDraft | null>;
  build(record: AcquisitionRecord): Promise<CommercialCommunicationDraft | null>;
}

const databaseRepository: CommercialDraftRepository = {
  async load(workspaceId, submissionId) {
    const { loadAcquisitionRecord } = await import("./acquisition-store");
    return loadAcquisitionRecord(workspaceId, submissionId);
  },
  async save(workspaceId, submissionId, draft) {
    const { saveCommercialDraft } = await import("./acquisition-store");
    return saveCommercialDraft(workspaceId, submissionId, draft);
  },
  async build(record) {
    const { loadProjectIntake } = await import("@/lib/intake/md-project-intake-inbox");
    const intake = await loadProjectIntake(record.workspaceId, record.submissionId);
    return intake ? buildCommercialQualificationDraft(record, intake.intake) : null;
  },
};

export interface CommercialSendContext {
  workspaceId: string;
  submissionId: string;
  sessionKey: string;
  missionId?: string;
  recipientEmail: string;
  draftRevision: number;
}

export function parseCommercialSendContext(value: unknown): CommercialSendContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.workspaceId !== "string" || !candidate.workspaceId.trim() ||
    typeof candidate.submissionId !== "string" || !candidate.submissionId.trim() ||
    typeof candidate.sessionKey !== "string" || !candidate.sessionKey.trim() ||
    (candidate.missionId !== undefined && typeof candidate.missionId !== "string") ||
    typeof candidate.recipientEmail !== "string" || !candidate.recipientEmail.trim() ||
    typeof candidate.draftRevision !== "number" ||
    !Number.isSafeInteger(candidate.draftRevision) || candidate.draftRevision < 1
  ) {
    return null;
  }
  return {
    workspaceId: candidate.workspaceId.trim(),
    submissionId: candidate.submissionId.trim(),
    sessionKey: candidate.sessionKey.trim(),
    missionId: typeof candidate.missionId === "string" && candidate.missionId.trim()
      ? candidate.missionId.trim()
      : undefined,
    recipientEmail: candidate.recipientEmail.trim(),
    draftRevision: candidate.draftRevision,
  };
}

export interface CommercialApprovalResult {
  success: boolean;
  message: string;
  approvalRequest?: ToolApprovalRequest;
  code?: "PLAN_REQUIRED" | "APPROVAL_REQUIRED";
}

export interface CommercialApprovalBridge {
  execute(
    call: { callId: string; name: string; arguments: string },
    principal: CapabilityExecutionPrincipal,
  ): Promise<CommercialApprovalResult>;
}

export type CommercialConversationIntent =
  | { kind: "revise"; instruction: string }
  | { kind: "send-confirmation" }
  | { kind: "none" };

export function classifyCommercialConversationIntent(message: string): CommercialConversationIntent {
  const normalized = message.trim().toLocaleLowerCase("fr");
  if (
    /\b(oui|d'accord|ok|vas-y)\b/.test(normalized) &&
    /\b(envoie|envoyer|expédie|expedie)\b/.test(normalized)
  ) {
    return { kind: "send-confirmation" };
  }
  const referencesCommercialDraft = /\b(brouillon|communication|message|mail|e-?mail)\b/.test(normalized);
  const asksForRevision = /\b(reformul(?:e|er|ez)?|réécri(?:s|re|vez)?|reecri(?:s|re|vez)?|modifi(?:e|er|ez)?|raccourci(?:s|r|ssez)?|condens(?:e|er|ez)?|simplifi(?:e|er|ez)?|rempla(?:ce|cer|cez)?|substitu(?:e|er|ez)?)\b/.test(normalized);
  const asksForStyleChange = /\bplus\s+(direct|concis|court|simple)|\bmoins\s+(long|formel)/.test(normalized);
  if ((referencesCommercialDraft && asksForRevision) || asksForStyleChange) {
    return { kind: "revise", instruction: message.trim() };
  }
  return { kind: "none" };
}

export async function resolveCommercialDraft(
  workspaceId: string,
  submissionId: string,
  repository: CommercialDraftRepository = databaseRepository,
): Promise<{ record: AcquisitionRecord; draft: CommercialCommunicationDraft } | null> {
  const record = await repository.load(workspaceId, submissionId);
  if (!record) return null;
  const built = record.commercialDraft ? null : await repository.build(record);
  const draft = record.commercialDraft
    ?? (built ? await repository.save(workspaceId, submissionId, built) : null);
  return draft ? { record, draft } : null;
}

export async function updateCommercialDraft(input: {
  workspaceId: string;
  submissionId: string;
  subject: string;
  body: string;
}, repository: CommercialDraftRepository = databaseRepository): Promise<CommercialCommunicationDraft | null> {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || subject.length > 500 || !body || body.length > 50_000) {
    throw new Error("Commercial draft subject and body must be non-empty and within limits.");
  }
  const current = await resolveCommercialDraft(input.workspaceId, input.submissionId, repository);
  if (!current) return null;
  const draft: CommercialCommunicationDraft = {
    ...current.draft,
    subject,
    body,
    revision: current.draft.revision + 1,
    updatedAt: new Date().toISOString(),
    approval: { required: true, status: "pending" },
    delivery: { allowed: false, reason: "operator-approval-required" },
  };
  return repository.save(input.workspaceId, input.submissionId, draft);
}

export async function reviseCommercialDraft(input: {
  workspaceId: string;
  submissionId: string;
  subject: string;
  body: string;
}, repository: CommercialDraftRepository = databaseRepository): Promise<CommercialCommunicationDraft | null> {
  return updateCommercialDraft({
    workspaceId: input.workspaceId,
    submissionId: input.submissionId,
    subject: input.subject,
    body: input.body,
  }, repository);
}

export async function createCommercialSendProposal(input: {
  context: CommercialSendContext;
  principal: CapabilityExecutionPrincipal;
}, bridge: CommercialApprovalBridge): Promise<CommercialApprovalResult> {
  return bridge.execute({
    callId: crypto.randomUUID(),
    name: COMMERCIAL_EMAIL_SEND_CAPABILITY,
    arguments: JSON.stringify(input.context),
  }, input.principal);
}

export async function markCommercialDraftStatus(input: {
  workspaceId: string;
  submissionId: string;
  status: "approved" | "rejected";
}, repository: CommercialDraftRepository = databaseRepository): Promise<CommercialCommunicationDraft | null> {
  const current = await resolveCommercialDraft(input.workspaceId, input.submissionId, repository);
  if (!current) return null;
  const draft: CommercialCommunicationDraft = {
    ...current.draft,
    updatedAt: new Date().toISOString(),
    approval: { required: true, status: input.status },
    delivery: {
      allowed: false,
      reason: input.status === "approved"
        ? "transport-not-configured"
        : "operator-rejected",
    },
  };
  return repository.save(input.workspaceId, input.submissionId, draft);
}

export async function executeCommercialTransportBoundary(
  input: CommercialSendContext,
  repository: CommercialDraftRepository = databaseRepository,
) {
  const context = parseCommercialSendContext(input);
  if (!context) {
    return { success: false, code: "commercial-draft-context-invalid", message: "Le contexte du brouillon commercial est invalide." };
  }
  const current = await resolveCommercialDraft(context.workspaceId, context.submissionId, repository);
  if (!current || current.draft.recipient.email !== context.recipientEmail) {
    return { success: false, code: "commercial-draft-context-mismatch", message: "Le brouillon commercial ne correspond plus au destinataire validé." };
  }
  if (current.draft.revision !== context.draftRevision) {
    return { success: false, code: "commercial-draft-revision-mismatch", message: "Le brouillon commercial a été modifié depuis la demande de validation." };
  }
  const approved = await markCommercialDraftStatus({
    workspaceId: context.workspaceId,
    submissionId: context.submissionId,
    status: "approved",
  }, repository);
  if (!approved) {
    return { success: false, code: "commercial-draft-persistence-failed", message: "La validation n’a pas pu être persistée ; aucun e-mail n’a été envoyé." };
  }
  return {
    success: false,
    code: COMMERCIAL_TRANSPORT_NOT_CONFIGURED,
    message: "transport-not-configured — Validation obtenue. Le transport commercial IONOS pour clara@melodie.digital n’est pas configuré ; aucun e-mail n’a été envoyé.",
  };
}
