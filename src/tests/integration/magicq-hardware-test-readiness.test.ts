import assert from "node:assert/strict";
import test from "node:test";

import { assertMagicQHardwareTestReady } from "@/lib/connectors/internal/chamsys/magicq/hardware-test-readiness";

const activeConnection = {
  id: "conn-mq50",
  workspaceId: "workspace-angers",
  provider: "chamsys.magicq",
  status: "ACTIVE" as const,
  scopes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const connections = {
  async findById(id: string) {
    return id === activeConnection.id ? activeConnection : null;
  },
} as any;

const configurations = {
  async findByConnectionId(id: string) {
    if (id !== activeConnection.id) return null;
    return {
      host: "192.168.200.255",
      port: 6553,
      fixtureChannels: { "fixture-test": 1 },
    };
  },
} as any;

const plan = {
  workspaceId: "workspace-angers",
  connectionId: "conn-mq50",
  fixtureId: "fixture-test",
  expectedChannelNumber: 1,
  expectedHost: "192.168.200.255",
};

test("MagicQ hardware test readiness accepts an exact approved configuration", async () => {
  const result = await assertMagicQHardwareTestReady(connections, configurations, plan);
  assert.deepEqual(result, {
    ready: true,
    host: "192.168.200.255",
    port: 6553,
    channelNumber: 1,
  });
});

test("MagicQ hardware test readiness rejects drift in destination", async () => {
  await assert.rejects(
    assertMagicQHardwareTestReady(connections, configurations, {
      ...plan,
      expectedHost: "192.168.200.254",
    }),
    /MAGICQ_HOST_MISMATCH/,
  );
});

test("MagicQ hardware test readiness rejects drift in fixture mapping", async () => {
  await assert.rejects(
    assertMagicQHardwareTestReady(connections, configurations, {
      ...plan,
      expectedChannelNumber: 2,
    }),
    /MAGICQ_FIXTURE_CHANNEL_MISMATCH/,
  );
});

test("MagicQ hardware test readiness rejects the wrong workspace", async () => {
  await assert.rejects(
    assertMagicQHardwareTestReady(connections, configurations, {
      ...plan,
      workspaceId: "workspace-other",
    }),
    /MAGICQ_WORKSPACE_MISMATCH/,
  );
});
