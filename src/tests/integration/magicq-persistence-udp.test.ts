import assert from "node:assert/strict";
import test from "node:test";

import {
  MAGICQ_NETWORK_ENABLE_ENV,
  EnvironmentMagicQNetworkGate,
} from "@/lib/capabilities/magicq-lighting/server-executor";
import { validateMagicQConnectionConfiguration } from "@/lib/connectors/internal/chamsys/magicq/configuration-repository";
import { validateMagicQUdpDatagram } from "@/lib/connectors/internal/chamsys/magicq/node-udp-sender";

test("MagicQ connection configuration normalizes the default CREP port", () => {
  const configuration = validateMagicQConnectionConfiguration({
    host: " 192.168.200.255 ",
    fixtureChannels: {
      "fixture-1": 1,
      "fixture-2": 512,
    },
  });

  assert.deepEqual(configuration, {
    host: "192.168.200.255",
    port: 6553,
    fixtureChannels: {
      "fixture-1": 1,
      "fixture-2": 512,
    },
  });
});

test("MagicQ connection configuration rejects invalid channel mappings", () => {
  assert.throws(
    () => validateMagicQConnectionConfiguration({
      host: "192.168.200.255",
      fixtureChannels: { fixture: 0 },
    }),
    /MagicQ channel/,
  );

  assert.throws(
    () => validateMagicQConnectionConfiguration({
      host: "192.168.200.255",
      fixtureChannels: { "   ": 1 },
    }),
    /fixture ids/,
  );
});

test("MagicQ environment network gate is exact-match fail closed", () => {
  for (const value of [undefined, "", "1", "TRUE", "yes", "false"]) {
    const gate = new EnvironmentMagicQNetworkGate(() => value);
    assert.equal(gate.isEnabled(), false);
  }

  const enabled = new EnvironmentMagicQNetworkGate(() => "true");
  assert.equal(enabled.isEnabled(), true);
  assert.equal(MAGICQ_NETWORK_ENABLE_ENV, "CLARA_MAGICQ_NETWORK_ENABLED");
});

test("real UDP sender validates datagrams without emitting network traffic", () => {
  assert.doesNotThrow(() => validateMagicQUdpDatagram({
    host: "192.168.200.255",
    port: 6553,
    payload: new Uint8Array([0x50, 0x45, 0x52, 0x43]),
  }));

  assert.throws(
    () => validateMagicQUdpDatagram({
      host: "",
      port: 6553,
      payload: new Uint8Array([1]),
    }),
    /host/,
  );

  assert.throws(
    () => validateMagicQUdpDatagram({
      host: "192.168.200.255",
      port: 0,
      payload: new Uint8Array([1]),
    }),
    /port/,
  );

  assert.throws(
    () => validateMagicQUdpDatagram({
      host: "192.168.200.255",
      port: 6553,
      payload: new Uint8Array(),
    }),
    /payload/,
  );
});
