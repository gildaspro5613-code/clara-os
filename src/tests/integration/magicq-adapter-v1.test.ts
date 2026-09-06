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
  public readonly datagrams: UdpDatagram[] = [];

  async send(datagram: UdpDatagram): Promise<void> {
    this.datagrams.push(datagram);
  }
}

class FixedTargetResolver implements MagicQFixtureTargetResolver {
  public readonly requests: Array<{
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
  }> = [];

  async resolve(request: {
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
  }) {
    this.requests.push(request);
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
  assert.deepEqual(MagicQConnectorDefinition.authentication, { type: "none" });
  assert.deepEqual(MagicQConnectorDefinition.capabilities, [
    {
      id: MAGICQ_CAPABILITIES.FIXTURE_INTENSITY_SET,
      operationType: "EXECUTE",
      description:
        "Set the intensity of one resolved MagicQ DMX channel through CREP.",
    },
  ]);
});

test("resolves Clara fixture id before framing a CREP intensity command", async () => {
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
  assert.equal(
    new TextDecoder().decode(sender.datagrams[0]?.payload.slice(10)),
    "42,50I",
  );
  assert.deepEqual(result, {
    provider: "chamsys",
    connectorId: "chamsys.magicq",
    capability: "lighting.fixture.intensity.set",
    fixtureId: "fixture-front-1",
    requestedIntensityPercent: 50,
    dispatched: true,
  });
});

test("rejects invalid Clara inputs before transport", async () => {
  const sender = new MemoryUdpSender();
  const targets = new FixedTargetResolver();
  const adapter = new MagicQConnectorAdapter(targets, sender);

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
      intensityPercent: 101,
    }),
    RangeError,
  );

  assert.equal(sender.datagrams.length, 0);
});

test("fails closed when a Clara fixture has no MagicQ mapping", async () => {
  const sender = new MemoryUdpSender();
  const targets = new FixedTargetResolver();
  const adapter = new MagicQConnectorAdapter(targets, sender);

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
