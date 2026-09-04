import assert from "node:assert/strict";
import test from "node:test";

import type { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { MakeConnectorAdapter } from "@/lib/connectors/make/adapter";
import { MakeWebhookClient, MakeWebhookError } from "@/lib/connectors/make/client";
import { MAKE_CAPABILITIES, MakeConnectorDefinition } from "@/lib/connectors/make/definition";

type Call = { url: string; init?: RequestInit };

function fakeHttp(response: Response) {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return response;
    },
  };
}

test("Make definition exposes only prepare and execute V1 capabilities", () => {
  assert.equal(MakeConnectorDefinition.id, "make");
  assert.deepEqual(MakeConnectorDefinition.authentication, {
    type: "webhook",
    credentialReference: "connectionId",
  });
  assert.deepEqual(
    MakeConnectorDefinition.capabilities.map(({ id }) => id),
    Object.values(MAKE_CAPABILITIES),
  );
  assert.equal(
    MakeConnectorDefinition.capabilities.find(({ id }) => id === MAKE_CAPABILITIES.SCENARIO_PREPARE)?.operationType,
    "PREPARE",
  );
  assert.equal(
    MakeConnectorDefinition.capabilities.find(({ id }) => id === MAKE_CAPABILITIES.SCENARIO_EXECUTE)?.operationType,
    "EXECUTE",
  );
});

test("prepare does not resolve credentials or perform network I/O", async () => {
  let resolved = false;
  const resolver = {
    async resolve() {
      resolved = true;
      throw new Error("Should not resolve credentials while preparing");
    },
  } as unknown as ConnectionResolver;

  const adapter = new MakeConnectorAdapter(resolver, async () => {
    throw new Error("Should not perform network I/O while preparing");
  });

  const result = await adapter.execute("connection-1", {
    capability: MAKE_CAPABILITIES.SCENARIO_PREPARE,
    input: { scenarioKey: "  crm-contact-sync  ", payload: { contactId: 7 } },
  });

  assert.equal(resolved, false);
  assert.deepEqual(result.data, {
    prepared: true,
    scenarioKey: "crm-contact-sync",
    payload: { contactId: 7 },
  });
});

test("execute resolves the webhook from the credential store rather than user input", async () => {
  const http = fakeHttp(new Response(JSON.stringify({ accepted: true }), { status: 200 }));
  const resolver = {
    async resolve(connectionId: string, providerId: string) {
      assert.equal(connectionId, "connection-1");
      assert.equal(providerId, "make");
      return {
        credentials: {
          scenarios: {
            "crm-contact-sync": {
              url: "https://hook.eu2.make.com/secret-path",
              headers: { "x-clara-secret": "secret-header" },
            },
          },
        },
      };
    },
  } as unknown as ConnectionResolver;

  const adapter = new MakeConnectorAdapter(resolver, http.fetch);
  const result = await adapter.execute("connection-1", {
    capability: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    input: { scenarioKey: "crm-contact-sync", payload: { contactId: 7 } },
  });

  assert.equal(result.provider, "make");
  assert.equal(http.calls[0]?.url, "https://hook.eu2.make.com/secret-path");
  assert.equal(new Headers(http.calls[0]?.init?.headers).get("x-clara-secret"), "secret-header");
  assert.deepEqual(JSON.parse(String(http.calls[0]?.init?.body)), {
    scenarioKey: "crm-contact-sync",
    payload: { contactId: 7 },
    source: "clara-os",
  });
});

test("unknown scenario keys fail before any webhook call", async () => {
  let called = false;
  const resolver = {
    async resolve() {
      return { credentials: { scenarios: {} } };
    },
  } as unknown as ConnectionResolver;
  const adapter = new MakeConnectorAdapter(resolver, async () => {
    called = true;
    return new Response(null, { status: 200 });
  });

  await assert.rejects(
    () => adapter.execute("connection-1", {
      capability: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
      input: { scenarioKey: "not-configured" },
    }),
    /not configured/,
  );
  assert.equal(called, false);
});

test("webhook client rejects non-HTTPS destinations", async () => {
  const client = new MakeWebhookClient(async () => new Response(null, { status: 200 }));
  await assert.rejects(
    () => client.execute(
      { url: "http://localhost:3000/internal" },
      { scenarioKey: "unsafe" },
    ),
    (error) => error instanceof MakeWebhookError && /HTTPS/.test(error.message),
  );
});
