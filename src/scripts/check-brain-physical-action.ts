import assert from "node:assert/strict";
import { buildExecutionPlan } from "../lib/brain/planners";
import { authorizePhysicalAction } from "../lib/connectors/clara-live/physical-action";
import { authorizeApprovedPhysicalAction } from "../lib/connectors/clara-live/operator-approval";
import { DecisionPriority } from "../types/decision";
import { InMemoryPhysicalActionProposalStore } from "../lib/connectors/clara-live/physical-action-store";

const decision = {
  id: "decision-1",
  objective: {
    id: "objective-1",
    title: "Set playback",
    description: "Prepare PB1 at 37%",
    priority: 1,
    completed: false,
  },
  summary: "Prepare PB1 at 37%",
  priority: DecisionPriority.MEDIUM,
  createdAt: new Date(),
};

const planned = buildExecutionPlan(decision, {
  agentId: "agent-1",
  connector: "chamsys_mq50",
  capability: "playback_level",
  parameters: { playback: 1, level: 37 },
  sessionId: "session-1",
});

assert.equal(planned.tasks.length, 1);
assert.equal(planned.physicalActions.length, 1);
assert.equal(planned.physicalActions[0].status, "PROPOSED");
assert.equal(planned.physicalActions[0].taskId, planned.tasks[0].id);
assert.equal("authorizedAt" in planned.physicalActions[0], false);

assert.throws(
  () => authorizePhysicalAction(planned.physicalActions[0], "   "),
  /authorizedBy is required/,
);

assert.throws(
  () => authorizeApprovedPhysicalAction(
    planned.physicalActions[0],
    {
      proposalId: planned.physicalActions[0].id,
      approved: true,
      confirmedAt: new Date(),
    },
    null,
  ),
  /authenticated operator is required/,
);

assert.throws(
  () => authorizeApprovedPhysicalAction(
    planned.physicalActions[0],
    {
      proposalId: "another-proposal",
      approved: true,
      confirmedAt: new Date(),
    },
    {
      id: "operator-1",
      authenticationSource: "test-auth",
      authenticatedAt: new Date(),
    },
  ),
  /does not match/,
);

const explicitlyApproved = authorizeApprovedPhysicalAction(
  planned.physicalActions[0],
  {
    proposalId: planned.physicalActions[0].id,
    approved: true,
    confirmedAt: new Date(),
  },
  {
    id: "operator-1",
    authenticationSource: "test-auth",
    authenticatedAt: new Date(),
  },
);
assert.equal(explicitlyApproved.status, "AUTHORIZED");
assert.equal(explicitlyApproved.id, planned.physicalActions[0].id);
assert.equal(explicitlyApproved.authorizedBy, "operator-1");

const store = new InMemoryPhysicalActionProposalStore();
await store.create({
  ...planned.physicalActions[0],
  ownerId: "operator-1",
  conversationId: "conversation-1",
  expiresAt: new Date(Date.now() + 60_000),
});
const stored = await store.get(planned.physicalActions[0].id);
assert.equal(stored?.ownerId, "operator-1");
assert.equal(stored?.conversationId, "conversation-1");
const consumed = await store.consume(planned.physicalActions[0].id);
assert.equal(consumed?.id, planned.physicalActions[0].id);
assert.equal(await store.get(planned.physicalActions[0].id), null);
assert.equal(await store.consume(planned.physicalActions[0].id), null);

console.log("Brain physical action proposal contract: OK");
