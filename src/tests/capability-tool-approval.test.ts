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

test('Make acknowledgements remain requested in the durable audit until explicit completion evidence',async()=>{
 for(const status of [undefined,'accepted','pending','completed'] as const){
  const events:ToolAuditEvent[]=[];
  const bridge=new CapabilityToolBridge({async record(e){events.push(e);}},{async create(){throw Error('No second approval may be created');}},
   {async execute(){return {success:true,message:'Provider acknowledgement only',operationalResult:{success:true,provider:'make',capabilityId:'make.scenario.execute',status},completedAt:new Date()};}});
  const result=await bridge.execute({callId:'synthetic-operation',name:'make.scenario.execute',arguments:JSON.stringify({scenarioKey:'synthetic-only'})},{actorId:'owner',workspaceId:'isolated-w',plan:'premium',approvedCapabilityIds:['make.scenario.execute']});
  assert.equal(result.success,true);assert.deepEqual(events.map(e=>e.status),['REQUESTED',status==='completed'?'SUCCEEDED':'REQUESTED']);
 }
});
