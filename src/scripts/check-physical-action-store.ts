import assert from "node:assert/strict";
import { InMemoryPhysicalActionProposalStore } from "../lib/connectors/clara-live/physical-action-store";

const store = new InMemoryPhysicalActionProposalStore();
const now = new Date();

await store.create({
  id: "proposal-1",
  taskId: "task-1",
  agentId: "agent-1",
  connector: "chamsys_mq50",
  capability: "playback_level",
  parameters: { playback: 1, level: 37 },
  sessionId: "session-1",
  status: "PROPOSED",
  proposedAt: now,
  ownerId: "operator-1",
  conversationId: "conversation-1",
  expiresAt: new Date(Date.now() + 60_000),
});

assert.equal((await store.get("proposal-1"))?.ownerId, "operator-1");
assert.equal((await store.consume("proposal-1"))?.id, "proposal-1");
assert.equal(await store.get("proposal-1"), null);
assert.equal(await store.consume("proposal-1"), null);

await store.create({
  id: "expired-1",
  taskId: "task-2",
  agentId: "agent-1",
  connector: "chamsys_mq50",
  capability: "playback_level",
  parameters: { playback: 1, level: 10 },
  sessionId: "session-1",
  status: "PROPOSED",
  proposedAt: now,
  ownerId: "operator-1",
  conversationId: "conversation-1",
  expiresAt: new Date(Date.now() - 1),
});
assert.equal(await store.consume("expired-1"), null);

console.log("Physical proposal store contract: OK");
