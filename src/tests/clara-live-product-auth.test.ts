import assert from "node:assert/strict";
import test from "node:test";
import { authenticateExternalProduct, ExternalProductConfigurationError, loadExternalProducts } from "@/lib/external-capabilities/config";
import { ExternalCapabilityGateway, ExternalCapabilityGatewayError } from "@/lib/external-capabilities/gateway";
import { executeExternalProductCapability } from "@/lib/external-capabilities/product-callback";

const names = ["CLARA_LIVE_PRODUCT_TOKEN", "CLARA_LIVE_WORKSPACE_ID", "CLARA_LIVE_CAPABILITIES", "CLARA_LIVE_CALLBACK_BASE_URL", "CLARA_MD_PRODUCT_TOKEN", "CLARA_MD_WORKSPACE_ID"];
const fixtureCredential = "unit-test-credential";
const legacy = JSON.stringify({
  "clara-live": { workspaceId: "legacy-live", token: "legacy-test-credential", capabilities: ["old-grant"], callbackBaseUrl: "https://live.example/" },
  "other-product": { workspaceId: "other-workspace", token: "other-test-credential", capabilities: ["other-grant"] },
  "melodie-digital-site": { workspaceId: "legacy-studio", token: "legacy-studio-credential", capabilities: ["legacy-grant"] },
});

function withEnv(values: Record<string, string>, run: () => void) {
  const original = names.map((name) => process.env[name]);
  try {
    for (const name of names) delete process.env[name];
    Object.assign(process.env, values);
    run();
  } finally {
    names.forEach((name, index) => {
      if (original[index] === undefined) delete process.env[name];
      else process.env[name] = original[index];
    });
  }
}
const dedicated = {
  CLARA_LIVE_PRODUCT_TOKEN: fixtureCredential,
  CLARA_LIVE_WORKSPACE_ID: "dedicated-live",
  CLARA_LIVE_CAPABILITIES: '["stripe.subscription.read"]',
};

test("dedicated Live authenticates independently of JSON and rejects wrong or cross-product credentials", () => {
  withEnv(dedicated, () => {
    const products = loadExternalProducts(undefined);
    assert.equal(authenticateExternalProduct("clara-live", `Bearer ${fixtureCredential}`, products)?.workspaceId, "dedicated-live");
    assert.equal(authenticateExternalProduct("clara-live", "Bearer incorrect", products), null);
    assert.equal(authenticateExternalProduct("other-product", `Bearer ${fixtureCredential}`, products), null);
    assert.equal(authenticateExternalProduct("clara-live", null, products), null);
  });
});

test("absent dedicated variables preserve legacy JSON authentication", () => {
  withEnv({}, () => {
    assert.equal(authenticateExternalProduct("clara-live", "Bearer legacy-test-credential", loadExternalProducts(legacy))?.workspaceId, "legacy-live");
  });
});

test("dedicated Live overrides only its credentials and grants, preserving callback, other products and Studio", () => {
  withEnv({ ...dedicated, CLARA_MD_PRODUCT_TOKEN: "studio-test-credential", CLARA_MD_WORKSPACE_ID: "studio-workspace" }, () => {
    const products = loadExternalProducts(legacy);
    assert.equal(products.size, 3);
    assert.equal(products.get("clara-live")?.callbackBaseUrl, "https://live.example");
    assert.deepEqual(products.get("clara-live")?.capabilities, ["stripe.subscription.read"]);
    assert.equal(authenticateExternalProduct("clara-live", "Bearer legacy-test-credential", products), null);
    assert.equal(authenticateExternalProduct("other-product", "Bearer other-test-credential", products)?.workspaceId, "other-workspace");
    const studio = authenticateExternalProduct("melodie-digital-site", "Bearer studio-test-credential", products);
    assert.equal(studio?.workspaceId, "studio-workspace");
    assert.deepEqual(studio?.capabilities, ["project-intake"]);
  });
});

test("partial or invalid dedicated configuration never falls back or leaks supplied values", () => {
  const invalid = [
    { CLARA_LIVE_PRODUCT_TOKEN: fixtureCredential },
    { CLARA_LIVE_WORKSPACE_ID: "dedicated-live" },
    { CLARA_LIVE_CAPABILITIES: '["read"]' },
    { ...dedicated, CLARA_LIVE_PRODUCT_TOKEN: "" },
    { ...dedicated, CLARA_LIVE_WORKSPACE_ID: " " },
    { ...dedicated, CLARA_LIVE_WORKSPACE_ID: "unsafe/workspace" },
    { ...dedicated, CLARA_LIVE_CAPABILITIES: "invalid-json" },
    { ...dedicated, CLARA_LIVE_CAPABILITIES: "" },
    { ...dedicated, CLARA_LIVE_CAPABILITIES: "{}" },
    { ...dedicated, CLARA_LIVE_CAPABILITIES: "null" },
    { ...dedicated, CLARA_LIVE_CAPABILITIES: '["read",false]' },
    { ...dedicated, CLARA_LIVE_CAPABILITIES: '[" "]' },
  ];
  for (const values of invalid) withEnv(values, () => {
    assert.throws(() => loadExternalProducts(legacy), (error: unknown) => {
      assert.ok(error instanceof ExternalProductConfigurationError);
      assert.equal(error.message, "Invalid dedicated Clara Live configuration.");
      assert.ok(!error.message.includes(fixtureCredential));
      return true;
    });
  });
});

test("empty dedicated grants authenticate but cannot execute any gateway capability", async () => {
  let product: ReturnType<typeof authenticateExternalProduct> = null;
  withEnv({ ...dedicated, CLARA_LIVE_CAPABILITIES: "[]" }, () => {
    product = authenticateExternalProduct("clara-live", `Bearer ${fixtureCredential}`, loadExternalProducts(legacy));
    assert.ok(product);
    assert.deepEqual(product.capabilities, []);
  });
  assert.ok(product);
  let executions = 0;
  const gateway = new ExternalCapabilityGateway({ async execute() { executions++; return {}; } });
  for (const capability of ["stripe.subscription.read", "stripe.checkout.session.create", "run_project_computation", "unknown"]) {
    await assert.rejects(() => gateway.execute(product!, { capability, input: {} }),
      (error: unknown) => error instanceof ExternalCapabilityGatewayError && error.code === "CAPABILITY_NOT_ALLOWED");
  }
  assert.equal(executions, 0);
});

test("empty JSON grants remain invalid for Live and other legacy products", () => {
  withEnv({}, () => {
    for (const productId of ["clara-live", "other-product"]) {
      assert.throws(() => loadExternalProducts(JSON.stringify({ [productId]: {
        workspaceId: "test-workspace", token: fixtureCredential, capabilities: [],
      } })), ExternalProductConfigurationError);
    }
  });
});

test("dedicated products remain available with malformed legacy JSON, without inventing other grants", () => {
  withEnv(dedicated, () => {
    const products = loadExternalProducts("not-json");
    assert.equal(products.size, 1);
    assert.equal(products.has("other-product"), false);
  });
});

test("capabilities are explicit, trimmed and deduplicated; invalid callbacks are still rejected", () => {
  withEnv({ ...dedicated, CLARA_LIVE_CAPABILITIES: '[" read ","read"]' }, () => {
    assert.deepEqual(loadExternalProducts("").get("clara-live")?.capabilities, ["read"]);
    assert.throws(() => loadExternalProducts(JSON.stringify({ "clara-live": { callbackBaseUrl: "http://live.example" } })), ExternalProductConfigurationError);
  });
});

test("existing Live event headers and unified scope authenticate without contract changes", () => {
  withEnv(dedicated, () => {
    const headers = new Headers({ Authorization: `Bearer ${fixtureCredential}`, "x-clara-product": "clara-live", "Content-Type": "application/json" });
    const event = { schemaVersion: "clara.unified-core.event.v1", eventType: "USER_MESSAGE",
      scope: { productId: "clara-live", workspaceId: "live-project", userId: "live-user", sessionId: "live-session" },
      message: "Continue", context: {}, documents: [], liveCapabilities: [] };
    const product = authenticateExternalProduct(headers.get("x-clara-product"), headers.get("authorization"), loadExternalProducts(""));
    assert.equal(product?.productId, event.scope.productId);
    assert.equal(product?.workspaceId, "dedicated-live");
    assert.ok(product?.workspaceId !== event.scope.workspaceId);
    assert.ok(!JSON.stringify(event).includes(fixtureCredential));
  });
});

test("dedicated HTTPS callback is independent of JSON and overrides only Live's destination", () => {
  withEnv({ ...dedicated, CLARA_LIVE_CAPABILITIES: "[]", CLARA_LIVE_CALLBACK_BASE_URL: "https://live.example.com///" }, () => {
    assert.equal(loadExternalProducts("").get("clara-live")?.callbackBaseUrl, "https://live.example.com");
    const config = JSON.parse(legacy);
    config["other-product"].callbackBaseUrl = "https://other.example.com/";
    config["clara-live"].callbackBaseUrl = "http://obsolete.example.com";
    const products = loadExternalProducts(JSON.stringify(config));
    assert.equal(products.get("clara-live")?.callbackBaseUrl, "https://live.example.com");
    assert.equal(products.get("other-product")?.callbackBaseUrl, "https://other.example.com");
    assert.deepEqual(products.get("clara-live")?.capabilities, []);
  });
});

test("malformed or unsafe dedicated callbacks are refused without disclosing URL contents", () => {
  const invalid = ["", "not-a-url", "http://live.example.com", "https://user:private-value@live.example.com",
    "https://live.example.com?credential=private-value", "https://live.example.com#private-value",
    "https://live.example.com?", "https://live.example.com#",
    "https://localhost", "https://service.local", "https://metadata.google.internal",
    "https://127.0.0.1", "https://10.1.2.3", "https://169.254.169.254", "https://[::1]",
    "https://2130706433", "https://bad..example.com", "https://live.example.com\\private-value",
    "https://live.example.com/api/core/capabilities/execute/", "https://live.example.com/\nprivate-value"];
  for (const url of invalid) withEnv({ ...dedicated, CLARA_LIVE_CALLBACK_BASE_URL: url }, () => {
    assert.throws(() => loadExternalProducts(legacy), (error: unknown) => {
      assert.ok(error instanceof ExternalProductConfigurationError);
      assert.equal(error.message, "Invalid dedicated Clara Live callback URL.");
      return true;
    });
  });
  withEnv({ CLARA_LIVE_CALLBACK_BASE_URL: "https://live.example.com" }, () => {
    assert.throws(() => loadExternalProducts(legacy), ExternalProductConfigurationError);
  });
});

test("callback transport appends the existing route exactly once with unchanged product authentication", async () => {
  let product: ReturnType<typeof authenticateExternalProduct> = null;
  withEnv({ ...dedicated, CLARA_LIVE_CAPABILITIES: "[]", CLARA_LIVE_CALLBACK_BASE_URL: "https://live.example.com/" }, () => {
    product = loadExternalProducts("").get("clara-live")!;
  });
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(input, "https://live.example.com/api/core/capabilities/execute");
      assert.equal(init?.method, "POST");
      const headers = new Headers(init?.headers);
      assert.ok(headers.get("Authorization") === `Bearer ${fixtureCredential}`);
      assert.equal(headers.get("x-clara-product"), "clara-live");
      assert.ok(!String(init?.body).includes(fixtureCredential));
      return Response.json({ success: true, result: { readiness: "available" } });
    };
    const result = await executeExternalProductCapability(product!, {
      capability: "get_spatial_readiness", userId: "live-user", workspaceId: "live-project", sessionId: "live-session", context: {},
    });
    assert.equal(result.success, true);
  } finally { globalThis.fetch = original; }
});
