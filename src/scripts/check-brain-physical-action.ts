import assert from "node:assert/strict";
import { buildExecutionPlan } from "../lib/brain/planners";
import { authorizePhysicalAction } from "../lib/connectors/clara-live/physical-action";
import { authorizeApprovedPhysicalAction } from "../lib/connectors/clara-live/operator-approval";
import { DecisionPriority } from "../types/decision";

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

const authorized = authorizePhysicalAction(planned.physicalActions[0], "operator-1");
assert.equal(authorized.status, "AUTHORIZED");
assert.equal(authorized.authorizedBy, "operator-1");
assert.ok(authorized.authorizedAt instanceof Date);

console.log("Brain physical action proposal contract: OK");

assert.throws(
  () => authorizeApprovedPhysicalAction(planned.physicalActions[0], {
    proposalId: "another-proposal",
    approved: true,
    actorId: "operator-1",
    confirmedAt: new Date(),
  }),
  /does not match/,
);

const explicitlyApproved = authorizeApprovedPhysicalAction(planned.physicalActions[0], {
  proposalId: planned.physicalActions[0].id,
  approved: true,
  actorId: "operator-1",
  confirmedAt: new Date(),
});
assert.equal(explicitlyApproved.status, "AUTHORIZED");
assert.equal(explicitlyApproved.id, planned.physicalActions[0].id);
