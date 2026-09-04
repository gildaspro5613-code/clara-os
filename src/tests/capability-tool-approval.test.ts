import assert from "node:assert/strict";
import test from "node:test";

import { CapabilityToolBridge } from "@/lib/capabilities/capability-tool-bridge";
import type { ToolAuditEvent, ToolAuditWriter } from "@/lib/capabilities/tool-audit-repository";
import type { ToolApprovalRequest, ToolApprovalWriter } from "@/lib/capabilities/tool-approval-repository";

test("a GPT write call creates an approval instead of executing", async () => {
  const auditEvents: ToolAuditEvent[] = [];
  const audit: ToolAuditWriter = { async record(event) { auditEvents.push(event); } };
  const expected: ToolApprovalRequest = {
    id: "approval-1",
    token: "single-use-token",
    capabilityId: "send-gmail",
    summary: "Autoriser Clara à exécuter send-gmail",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  let approvalInput: unknown;
  const approvals: ToolApprovalWriter = {
    async create(input) {
      approvalInput = input;
      return expected;
    },
  };

  const bridge = new CapabilityToolBridge(audit, approvals, {
    async execute() {
      throw new Error("Approval-gated capability must not execute before approval.");
    },
  });
  const result = await bridge.execute({
    callId: "call-1",
    name: "send-gmail",
    arguments: JSON.stringify({ to: "client@example.com", subject: "Test", body: "Bonjour" }),
  }, {
    actorId: "owner",
    workspaceId: "melodie-digital",
    plan: "premium",
    approvedCapabilityIds: [],
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "APPROVAL_REQUIRED");
  assert.deepEqual(result.approvalRequest, expected);
  assert.equal((approvalInput as { capabilityId: string }).capabilityId, "send-gmail");
  assert.deepEqual(auditEvents.map(({ status }) => status), ["REQUESTED", "DENIED"]);
});
