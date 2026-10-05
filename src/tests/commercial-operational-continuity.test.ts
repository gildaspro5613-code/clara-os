import assert from "node:assert/strict";
import test from "node:test";

import type { AcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import type { CommercialCommunicationDraft } from "@/lib/acquisition/commercial-communication-draft";
import {
  COMMERCIAL_EMAIL_SEND_CAPABILITY,
  COMMERCIAL_TRANSPORT_NOT_CONFIGURED,
  classifyCommercialConversationIntent,
  createCommercialSendProposal,
  executeCommercialTransportBoundary,
  parseCommercialSendContext,
  reviseCommercialDraft,
  updateCommercialDraft,
  type CommercialDraftRepository,
} from "@/lib/acquisition/commercial-communication-service";
import { parseCommercialDraftRevision } from "@/lib/brain/response-composer";
import { authorizeCapability } from "@/lib/capabilities/capability-policy";
import type { ToolApprovalRequest } from "@/lib/capabilities/tool-approval-repository";
import { createSession } from "@/lib/core/session";
import { projectOwnedSession } from "@/lib/core/operational-session-projection";
import type { Mission } from "@/modules/missions/types/Mission";

function draft(): CommercialCommunicationDraft {
  return {
    schema: "clara.commercial-communication-draft.v1",
    submissionId: "submission-1",
    channel: "email",
    sender: { identity: "commercial", email: "clara@melodie.digital", name: "Clara — Mélodie Digital" },
    recipient: { name: "Prospect", email: "prospect@example.com" },
    subject: "Objet initial",
    body: "Bonjour,\n\nMerci pour votre demande auprès de Mélodie Digital. J’ai commencé à structurer votre projet afin de pouvoir poursuivre sa qualification.\n\nIl me manque simplement quelques précisions :\n• Pouvez-vous confirmer la date ?",
    revision: 1,
    updatedAt: "2026-10-04T00:00:00.000Z",
    approval: { required: true, status: "pending" },
    delivery: { allowed: false, reason: "operator-approval-required" },
  };
}

function repository(): { repository: CommercialDraftRepository; read(): CommercialCommunicationDraft } {
  let stored = draft();
  const record = { workspaceId: "melodie-digital", submissionId: "submission-1", commercialDraft: stored } as AcquisitionRecord;
  return {
    repository: {
      async load() { return { ...record, commercialDraft: stored }; },
      async save(_workspaceId, _submissionId, next) { stored = structuredClone(next); return structuredClone(stored); },
      async build() { return null; },
    },
    read: () => structuredClone(stored),
  };
}

test("commercial draft modification persists in and reloads from the acquisition record", async () => {
  const memory = repository();
  const saved = await updateCommercialDraft({
    workspaceId: "melodie-digital",
    submissionId: "submission-1",
    subject: "Objet modifié",
    body: "Corps modifié durablement.",
  }, memory.repository);

  assert.equal(saved?.revision, 2);
  assert.equal(memory.read().subject, "Objet modifié");
  assert.equal(memory.read().body, "Corps modifié durablement.");
  assert.equal(memory.read().approval.status, "pending");
});

test("Clara revises the same durable draft from a conversational instruction", async () => {
  const memory = repository();
  const composed = parseCommercialDraftRevision(JSON.stringify({
    subject: "Objet plus direct",
    body: "Bonjour,\n\nPouvez-vous confirmer la date afin que nous avancions ?\n\nClara\nMélodie Digital",
  }));
  assert.ok(composed);
  const revised = await reviseCommercialDraft({
    workspaceId: "melodie-digital",
    submissionId: "submission-1",
    ...composed,
  }, memory.repository);

  assert.equal(revised?.revision, 2);
  assert.notEqual(revised?.body, draft().body);
  assert.equal(memory.read().body, revised?.body);
});

test("conversation rewrite persists revision 2 in the acquisition record and survives reload", async () => {
  const memory = repository();
  const message = "Clara, peux-tu raccourcir et reformuler ce brouillon ?";
  const intent = classifyCommercialConversationIntent(message);
  assert.deepEqual(intent, { kind: "revise", instruction: message });

  const claraRevision = parseCommercialDraftRevision(JSON.stringify({
    subject: "Votre projet — date à confirmer",
    body: "Bonjour,\n\nPouvez-vous confirmer la date de votre événement ?\n\nBien cordialement,\nClara\nMélodie Digital",
  }));
  assert.ok(claraRevision);

  const persisted = await reviseCommercialDraft({
    workspaceId: "melodie-digital",
    submissionId: "submission-1",
    ...claraRevision,
  }, memory.repository);
  assert.equal(persisted?.revision, 2);

  const reloadedRecord = await memory.repository.load("melodie-digital", "submission-1");
  assert.equal(reloadedRecord?.commercialDraft?.revision, 2);
  assert.equal(reloadedRecord?.commercialDraft?.subject, claraRevision.subject);
  assert.equal(reloadedRecord?.commercialDraft?.body, claraRevision.body);
  assert.notEqual(reloadedRecord?.commercialDraft?.body, draft().body);
});

test("commercial confirmation creates an approval and remains fail-closed without Gmail or Brevo", async () => {
  assert.deepEqual(classifyCommercialConversationIntent("Oui Clara, envoie-le."), { kind: "send-confirmation" });
  const approvals: Array<{ capabilityId: string; arguments: string }> = [];
  let engineExecutions = 0;
  const approvalRequest: ToolApprovalRequest = {
    id: "approval-1",
    token: "token",
    capabilityId: COMMERCIAL_EMAIL_SEND_CAPABILITY,
    summary: "Validation commerciale",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const bridge = {
    async execute(call: { callId: string; name: string; arguments: string }, principal: Parameters<typeof authorizeCapability>[1]) {
      const decision = authorizeCapability(call.name, principal);
      if (!decision.allowed && decision.code === "APPROVAL_REQUIRED") {
        approvals.push({ capabilityId: call.name, arguments: call.arguments });
        return { success: false, message: decision.message, code: decision.code, approvalRequest } as const;
      }
      engineExecutions += 1;
      return { success: false, message: "unexpected execution" };
    },
  };
  const context = {
    workspaceId: "melodie-digital",
    submissionId: "submission-1",
    sessionKey: "external:prospect",
    missionId: "mission-1",
    recipientEmail: "prospect@example.com",
    draftRevision: 1,
  };
  assert.deepEqual(parseCommercialSendContext(context), context);

  const proposal = await createCommercialSendProposal({
    context,
    principal: { actorId: "owner-1", workspaceId: "melodie-digital", plan: "premium", approvedCapabilityIds: [] },
  }, bridge);

  assert.equal(proposal.code, "APPROVAL_REQUIRED");
  assert.equal(proposal.approvalRequest?.id, "approval-1");
  assert.equal(engineExecutions, 0);
  assert.equal(approvals[0].capabilityId, "commercial-email.send");
  assert.equal(approvals[0].capabilityId.includes("gmail"), false);
  assert.equal(approvals[0].capabilityId.includes("brevo"), false);

  const memory = repository();
  const boundary = await executeCommercialTransportBoundary(context, memory.repository);
  assert.equal(boundary.success, false);
  assert.equal(boundary.code, COMMERCIAL_TRANSPORT_NOT_CONFIGURED);
  assert.match(boundary.message, /aucun e-mail n’a été envoyé/i);
  assert.equal(memory.read().approval.status, "approved");
  assert.equal(memory.read().delivery.reason, "transport-not-configured");
});

test("P0 projection preserves the contextual owner session", () => {
  const mission = {
    id: "mission-1", title: "Mission", objective: "Objective", status: "active", priority: "high",
    createdAt: new Date(), tasks: [], progress: 0,
  } satisfies Mission;
  const defaultSession = createSession();
  defaultSession.conversation = [{ id: "default", role: "user", content: "default", createdAt: new Date().toISOString() }];
  const ownerSession = createSession();
  ownerSession.conversation = [{ id: "owner", role: "user", content: "owner", createdAt: new Date().toISOString() }];

  const projected = projectOwnedSession(mission, { key: "external:prospect", session: ownerSession }, defaultSession);
  assert.equal(projected.sessionKey, "external:prospect");
  assert.equal(projected.session.conversation[0].content, "owner");
  assert.equal(projected.session.mission?.id, "mission-1");
});
