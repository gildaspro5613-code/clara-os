import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGrandMA3IntensityMessage,
  GrandMA3LightingAdapter,
  type GrandMA3OscMessage,
} from "@/lib/connectors/internal/ma-lighting/grandma3";

test("grandMA3 builds documented OSC command-line intensity message", () => {
  assert.deepEqual(buildGrandMA3IntensityMessage(1, 75), {
    address: "/cmd",
    type: "s",
    value: "Fixture 1 At 75",
  });
});

test("grandMA3 resolves Clara fixture before dispatch", async () => {
  const messages: GrandMA3OscMessage[] = [];
  const adapter = new GrandMA3LightingAdapter(
    { async resolveFixture() { return { fixtureNumber: 42 }; } },
    { async send(message) { messages.push(message); } },
  );
  await adapter.setFixtureIntensity({
    workspaceId: "ws-1",
    connectionId: "conn-ma3",
    fixtureId: "front-wash-1",
    intensityPercent: 50,
  });
  assert.deepEqual(messages, [{ address: "/cmd", type: "s", value: "Fixture 42 At 50" }]);
});

test("grandMA3 invalid intensity fails before transport", () => {
  assert.throws(() => buildGrandMA3IntensityMessage(1, 101), RangeError);
});
