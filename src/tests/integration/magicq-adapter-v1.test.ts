import assert from "node:assert/strict";
import test from "node:test";

import {
  MAGICQ_CAPABILITIES,
  MagicQConnectorAdapter,
  MagicQConnectorDefinition,
  type MagicQFixtureTargetResolver,
  type UdpDatagram,
  type UdpDatagramSender,
} from "@/lib/connectors/internal/chamsys/magicq";

class MemoryUdpSender implements UdpDatagramSender {
  readonly datagrams: UdpDatagram[] = [];

  async send(datagram: UdpDatagram): Promise<void> {
    this.datagrams.push(datagram);
  }
}

class FixedTargetResolver implements MagicQFixtureTargetResolver {
  readonly requests: Array<{
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
  }> = [];

  async resolve(request: {
    readonly workspaceId: string;
    readonly connectionId: string;
    readonly fixtureId: string;
  }) {
    this.requests.push({ ...request });
    if (request.fixtureId === "unknown") {
      throw new Error("Fixture mapping not found.");
    }
    return {
      host: "192.0.2.255",
      port: 6553,
      channelNumber: 42,
    };
  }
}

test("declares one credential-free EXECUTE capability", () => {
  assert.equal(MagicQConnectorDefinition.id, "chamsys.magicq");
  assert.equal(MagicQConnectorDefinition.authentication.type, "none");
  assert.equal(MagicQConnectorDefinition.capabilities.length, 1);
  assert.equal(
    MagicQConnectorDefinition.capabilities[0]?.id,
    MAGICQ_CAPABILITIES.FIXTURE_INTENSITY_SET,
  );
  assert.equal(MagicQConnectorDefinition.capabilities[0]?.operationType, "EXECUTE");
});

test("resolves Clara fixture id before producing the CREP datagram", async () => {
  const sender = new MemoryUdpSender();
  const targets = new FixedTargetResolver();
  const adapter = new MagicQConnectorAdapter(targets, sender);

  const result = await adapter.setFixtureIntensity({
    workspaceId: "workspace-1",
    connectionId: "connection-1",
    fixtureId: "fixture-front-1",
    intensityPercent: 50,
  });

  assert.deepEqual(targets.requests, [
    {
      workspaceId: "workspace-1",
      connectionId: "connection-1",
      fixtureId: "fixture-front-1",
    },
  ]);
  assert.equal(sender.datagrams.length, 1);
  assert.equal(sender.datagrams[0]?.host, "192.0.2.255");
  assert.equal(sender.datagrams[0]?.port, 6553);
  assert.equal(
    new TextDecoder().decode(sender.datagrams[0]?.payload.slice(10)),
    "42,50I",
  );
  assert.equal(result.dispatched, true);
  assert.equal(result.fixtureId, "fixture-front-1");
  assert.equal(result.requestedIntensityPercent, 50);
});

test("rejects invalid input before any datagram is emitted", async () => {
  const sender = new MemoryUdpSender();
  const adapter = new MagicQConnectorAdapter(new FixedTargetResolver(), sender);

  await assert.rejects(
    adapter.setFixtureIntensity({
      workspaceId: "workspace-1",
      connectionId: "connection-1",
      fixtureId: " ",
      intensityPercent: 50,
    }),
    TypeError,
  );

  await assert.rejects(
    adapter.setFixtureIntensity({
      workspaceId: "workspace-1",
      connectionId: "connection-1",
      fixtureId: "fixture-front-1",
      intensityPercent: Number.NaN,
    }),
    RangeError,
  );

  assert.equal(sender.datagrams.length, 0);
});

test("fails closed when the fixture mapping does not exist", async () => {
  const sender = new MemoryUdpSender();
  const adapter = new MagicQConnectorAdapter(new FixedTargetResolver(), sender);

  await assert.rejects(
    adapter.setFixtureIntensity({
      workspaceId: "workspace-1",
      connectionId: "connection-1",
      fixtureId: "unknown",
      intensityPercent: 25,
    }),
    /Fixture mapping not found/,
  );

  assert.equal(sender.datagrams.length, 0);
});
