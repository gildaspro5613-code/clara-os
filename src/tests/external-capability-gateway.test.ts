import assert from "node:assert/strict";
import test from "node:test";

import {
  authenticateExternalProduct,
  loadExternalProducts,
} from "@/lib/external-capabilities/config";
import {
  ExternalCapabilityGateway,
  ExternalCapabilityGatewayError,
  type ExternalProviderExecutor,
} from "@/lib/external-capabilities/gateway";

const rawConfig = JSON.stringify({
  "clara-live": {
    workspaceId: "workspace-live",
    token: "live-secret-token",
    capabilities: [
      "stripe.checkout.session.create",
      "stripe.subscription.read",
      "stripe.billing_portal.session.create",
    ],
  },
});

test("external product config authenticates a bearer token without exposing workspace selection", () => {
  const products = loadExternalProducts(rawConfig);
  const product = authenticateExternalProduct(
    "clara-live",
    "Bearer live-secret-token",
    products,
  );

  assert.equal(product?.workspaceId, "workspace-live");
  assert.equal(product?.productId, "clara-live");
  assert.equal(authenticateExternalProduct("clara-live", "Bearer wrong", products), null);
  assert.equal(authenticateExternalProduct("unknown", "Bearer live-secret-token", products), null);
});

test("gateway rejects capabilities not granted to the external product", async () => {
  let called = false;
  const executor: ExternalProviderExecutor = {
    async execute() {
      called = true;
      return {};
    },
  };
  const gateway = new ExternalCapabilityGateway(executor);
  const product = loadExternalProducts(rawConfig).get("clara-live")!;

  await assert.rejects(
    () => gateway.execute(product, {
      capability: "stripe.payment.read",
      input: { paymentIntentId: "pi_1" },
    }),
    (error) =>
      error instanceof ExternalCapabilityGatewayError &&
      error.code === "CAPABILITY_NOT_ALLOWED",
  );
  assert.equal(called, false);
});

test("gateway forwards only an allow-listed capability and preserves product identity", async () => {
  const calls: unknown[] = [];
  const executor: ExternalProviderExecutor = {
    async execute(product, request) {
      calls.push({ product, request });
      return { id: "cs_123", url: "https://checkout.stripe.test/session" };
    },
  };
  const gateway = new ExternalCapabilityGateway(executor);
  const product = loadExternalProducts(rawConfig).get("clara-live")!;

  const result = await gateway.execute(product, {
    capability: "stripe.checkout.session.create",
    input: {
      offerKey: "pro",
      successUrl: "https://live.example/success",
      cancelUrl: "https://live.example/cancel",
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.productId, "clara-live");
  assert.equal(result.capability, "stripe.checkout.session.create");
  assert.deepEqual(result.data, {
    id: "cs_123",
    url: "https://checkout.stripe.test/session",
  });
  assert.equal(calls.length, 1);
});

test("configuration rejects products without a server-side workspace, token or capability policy", () => {
  assert.throws(
    () => loadExternalProducts(JSON.stringify({ "clara-live": { token: "x", capabilities: ["stripe.subscription.read"] } })),
    /Invalid external product configuration/,
  );
});
