import assert from "node:assert/strict";
import test from "node:test";

import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  MAGICQ_CREP_DEFAULT_PORT,
  type MagicQConnectionConfiguration,
  type MagicQConnectionConfigurationRepository,
  type UdpDatagram,
  type UdpDatagramSender,
} from "@/lib/connectors/internal/chamsys/magicq";
import {
  ConfiguredMagicQLightingExecutor,
  FeatureGatedMagicQUdpSender,
  type MagicQNetworkGate,
} from "@/lib/capabilities/magicq-lighting/configured-executor";

class FakeConnectionRepository implements ConnectionRepository {
  constructor(private readonly connection: Connection | null) {}

  async findById(connectionId: string): Promise<Connection | null> {
    return this.connection?.id === connectionId ? this.connection : null;
  }

  async findByWorkspaceAndProvider(): Promise<Connection | null> {
    return null;
  }

  async save(): Promise<void> {}
  async updateStatus(): Promise<void> {}
}

class FakeMagicQConfigurationRepository
implements MagicQConnectionConfigurationRepository {
  constructor(private readonly configuration: MagicQConnectionConfiguration | null) {}

  async findByConnectionId(): Promise<MagicQConnectionConfiguration | null> {
    return this.configuration;
  }
}

class MutableGate implements MagicQNetworkGate {
  constructor(public enabled = false) {}
  isEnabled(): boolean {
    return this.enabled;
  }
}

class CapturingSender implements UdpDatagramSender {
  readonly datagrams: UdpDatagram[] = [];
  async send(datagram: UdpDatagram): Promise<void> {
    this.datagrams.push(datagram);
  }
}

const connection: Connection = {
  id: "magicq-connection-1",
  workspaceId: "workspace-1",
  provider: "chamsys.magicq",
  status: ConnectionStatus.ACTIVE,
  scopes: [],
  createdAt: new Date("2026-09-06T00:00:00Z"),
  updatedAt: new Date("2026-09-06T00:00:00Z"),
};

const configuration: MagicQConnectionConfiguration = {
  host: "192.168.200.255",
  fixtureChannels: {
    "fixture-colorbeam-1": 17,
  },
};

test("configured executor reaches the CREP datagram boundary when gate is enabled", async () => {
  const capture = new CapturingSender();
  const gate = new MutableGate(true);
  const sender = new FeatureGatedMagicQUdpSender(gate, capture);
  const executor = new ConfiguredMagicQLightingExecutor(
    new FakeConnectionRepository(connection),
    new FakeMagicQConfigurationRepository(configuration),
    sender,
  );

  const result = await executor.setFixtureIntensity({
    workspaceId: "workspace-1",
    connectionId: "magicq-connection-1",
    fixtureId: "fixture-colorbeam-1",
    intensityPercent: 50,
  });

  assert.equal(result.dispatched, true);
  assert.equal(capture.datagrams.length, 1);
  assert.equal(capture.datagrams[0]?.host, "192.168.200.255");
  assert.equal(capture.datagrams[0]?.port, MAGICQ_CREP_DEFAULT_PORT);
  assert.ok((capture.datagrams[0]?.payload.length ?? 0) > 10);
});

test("network gate fails closed before delegate emission", async () => {
  const capture = new CapturingSender();
  const gate = new MutableGate(false);
  const sender = new FeatureGatedMagicQUdpSender(gate, capture);
  const executor = new ConfiguredMagicQLightingExecutor(
    new FakeConnectionRepository(connection),
    new FakeMagicQConfigurationRepository(configuration),
    sender,
  );

  await assert.rejects(
    executor.setFixtureIntensity({
      workspaceId: "workspace-1",
      connectionId: "magicq-connection-1",
      fixtureId: "fixture-colorbeam-1",
      intensityPercent: 50,
    }),
    /MAGICQ_NETWORK_DISABLED/,
  );

  assert.equal(capture.datagrams.length, 0);
});

test("Universal Connections validation remains active inside configured executor", async () => {
  const capture = new CapturingSender();
  const sender = new FeatureGatedMagicQUdpSender(new MutableGate(true), capture);
  const executor = new ConfiguredMagicQLightingExecutor(
    new FakeConnectionRepository(connection),
    new FakeMagicQConfigurationRepository(configuration),
    sender,
  );

  await assert.rejects(
    executor.setFixtureIntensity({
      workspaceId: "wrong-workspace",
      connectionId: "magicq-connection-1",
      fixtureId: "fixture-colorbeam-1",
      intensityPercent: 50,
    }),
    /CONNECTION_WORKSPACE_MISMATCH/,
  );

  assert.equal(capture.datagrams.length, 0);
});
