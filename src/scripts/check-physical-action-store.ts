import assert from "node:assert/strict";
import { InMemoryPhysicalActionProposalStore } from "../lib/connectors/clara-live/physical-action-store";

const store = new InMemoryPhysicalActionProposalStore();
const now = new Date();
const future = new Date(8640000000000000 - 1);

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
  expiresAt: future,
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
  expiresAt: new Date("2000-01-01T00:00:00.000Z"),
});
assert.equal(await store.consume("expired-1"), null);

console.log("Physical proposal store contract: OK");
