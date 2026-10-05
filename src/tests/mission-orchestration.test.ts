import assert from "node:assert/strict";
import test from "node:test";

import { orchestrateMissions } from "@/modules/missions/mission-orchestrator";
import type { Mission, MissionPriority, MissionStatus } from "@/modules/missions/types/Mission";

function mission(input: {
  id: string;
  priority: MissionPriority;
  status?: MissionStatus;
  createdAt?: string;
  dueDate?: string;
}): Mission {
  return {
    id: input.id,
    title: input.id,
    objective: `Objective ${input.id}`,
    status: input.status ?? "active",
    priority: input.priority,
    createdAt: new Date(input.createdAt ?? "2026-01-01T00:00:00.000Z"),
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    tasks: [],
    progress: 0,
  };
}

test("canonical mission selection is independent from persistence order", () => {
  const latestLowPriority = mission({ id: "latest-low", priority: "low", createdAt: "2026-09-01T00:00:00.000Z" });
  const olderCritical = mission({ id: "older-critical", priority: "critical", createdAt: "2026-01-01T00:00:00.000Z" });

  assert.equal(
    orchestrateMissions([latestLowPriority, olderCritical]).current?.id,
    "older-critical",
  );
  assert.equal(
    orchestrateMissions([olderCritical, latestLowPriority]).current?.id,
    "older-critical",
  );
});

test("canonical mission selection falls back from active to blocked then planned", () => {
  const blocked = mission({ id: "blocked", priority: "medium", status: "blocked" });
  const planned = mission({ id: "planned", priority: "critical", status: "planned" });

  assert.equal(orchestrateMissions([planned, blocked]).current?.id, "blocked");
  assert.equal(orchestrateMissions([planned]).current?.id, "planned");
});
