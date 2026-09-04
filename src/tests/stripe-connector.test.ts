import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import type { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { StripeConnectorAdapter } from "@/lib/connectors/stripe/adapter";
import { StripeClient } from "@/lib/connectors/stripe/client";
import { STRIPE_CAPABILITIES, StripeConnectorDefinition } from "@/lib/connectors/stripe/definition";
import { verifyStripeWebhook } from "@/lib/connectors/stripe/webhook";

type Call = { url: string; init?: RequestInit };

function fakeHttp(responses: Response[]) {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const response = responses.shift();
      if (!response) throw new Error("Unexpected HTTP call");
      return response;
    },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Stripe definition exposes the focused billing V1 capability surface", () => {
  assert.equal(StripeConnectorDefinition.id, "stripe");
  assert.deepEqual(StripeConnectorDefinition.authentication, {
    type: "api_key",
    credentialReference: "connectionId",
  });
  assert.deepEqual(
    StripeConnectorDefinition.capabilities.map(({ id }) => id),
    Object.values(STRIPE_CAPABILITIES),
  );
  assert.equal(
    StripeConnectorDefinition.capabilities.find(({ id }) => id === STRIPE_CAPABILITIES.CHECKOUT_SESSION_CREATE)?.operationType,
    "EXECUTE",
  );
});

test("checkout resolves a Clara offer key to a protected Stripe price id", async () => {
  const http = fakeHttp([json({ id: "cs_123", url: "https://checkout.stripe.com/c/pay/cs_123" })]);
  const resolver = {
    async resolve(connectionId: string, provider: string) {
      assert.equal(connectionId, "stripe-connection");
      assert.equal(provider, "stripe");
      return {
        credentials: {
          secretKey: "sk_test_secret",
          prices: { pro: "price_pro_123" },
        },
      };
    },
  } as unknown as ConnectionResolver;

  const adapter = new StripeConnectorAdapter(resolver, http.fetch);
  const result = await adapter.execute("stripe-connection", {
    capability: STRIPE_CAPABILITIES.CHECKOUT_SESSION_CREATE,
    input: {
      offerKey: "pro",
      successUrl: "https://live.example.com/success",
      cancelUrl: "https://live.example.com/cancel",
      customerEmail: "client@example.com",
    },
  });

  assert.equal(result.provider, "stripe");
  const body = new URLSearchParams(String(http.calls[0]?.init?.body));
  assert.equal(body.get("line_items[0][price]"), "price_pro_123");
  assert.equal(body.get("customer_email"), "client@example.com");
  assert.equal(new Headers(http.calls[0]?.init?.headers).get("authorization"), "Bearer sk_test_secret");
});

test("unknown Clara offer keys fail before contacting Stripe", async () => {
  let called = false;
  const resolver = {
    async resolve() {
      return { credentials: { secretKey: "sk_test_secret", prices: {} } };
    },
  } as unknown as ConnectionResolver;
  const adapter = new StripeConnectorAdapter(resolver, async () => {
    called = true;
    return json({});
  });

  await assert.rejects(
    () => adapter.execute("stripe-connection", {
      capability: STRIPE_CAPABILITIES.CHECKOUT_SESSION_CREATE,
      input: {
        offerKey: "premium",
        successUrl: "https://live.example.com/success",
        cancelUrl: "https://live.example.com/cancel",
      },
    }),
    /not configured/,
  );
  assert.equal(called, false);
});

test("customer upsert reuses an existing Stripe customer", async () => {
  const http = fakeHttp([json({ data: [{ id: "cus_existing", email: "ada@example.com" }] })]);
  const resolver = {
    async resolve() {
      return { credentials: { secretKey: "sk_test_secret", prices: {} } };
    },
  } as unknown as ConnectionResolver;
  const adapter = new StripeConnectorAdapter(resolver, http.fetch);
  const result = await adapter.execute("stripe-connection", {
    capability: STRIPE_CAPABILITIES.CUSTOMER_UPSERT,
    input: { email: "Ada@Example.com" },
  });
  assert.deepEqual(result.data, { id: "cus_existing", email: "ada@example.com" });
  assert.equal(http.calls.length, 1);
});

test("Stripe client rejects non-HTTPS redirect URLs before network I/O", async () => {
  let called = false;
  const client = new StripeClient("sk_test_secret", async () => {
    called = true;
    return json({});
  });
  await assert.rejects(
    () => client.createCheckoutSession("price_1", {
      offerKey: "pro",
      successUrl: "http://example.com/success",
      cancelUrl: "https://example.com/cancel",
    }),
    /HTTPS/,
  );
  assert.equal(called, false);
});

test("Stripe webhook verification accepts a valid signature and rejects tampering", () => {
  const rawBody = JSON.stringify({
    id: "evt_123",
    type: "checkout.session.completed",
    data: { object: { id: "cs_123" } },
  });
  const timestamp = 1_800_000_000;
  const secret = "whsec_test_secret";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const header = `t=${timestamp},v1=${signature}`;

  assert.equal(
    verifyStripeWebhook(rawBody, header, secret, timestamp).type,
    "checkout.session.completed",
  );
  assert.throws(
    () => verifyStripeWebhook(`${rawBody}x`, header, secret, timestamp),
    /Invalid Stripe webhook signature/,
  );
});
