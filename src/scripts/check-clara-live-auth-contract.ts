/** Offline contract check: never reads or prints production credentials. */
import assert from "node:assert/strict";
import { authenticateExternalProduct, loadExternalProducts, ExternalProductConfigurationError } from "../lib/external-capabilities/config";

const keys = ["CLARA_LIVE_PRODUCT_TOKEN", "CLARA_LIVE_WORKSPACE_ID", "CLARA_LIVE_CAPABILITIES", "CLARA_LIVE_CALLBACK_BASE_URL", "CLARA_EXTERNAL_PRODUCTS_JSON", "CLARA_MD_PRODUCT_TOKEN"] as const;
const saved = new Map(keys.map((key) => [key, process.env[key]]));
const restore = () => { for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
try {
  for (const key of keys) delete process.env[key];
  process.env.CLARA_LIVE_PRODUCT_TOKEN = "synthetic-contract-token-not-a-secret";
  process.env.CLARA_LIVE_WORKSPACE_ID = "synthetic-workspace";
  process.env.CLARA_LIVE_CAPABILITIES = JSON.stringify(["document.status"]);
  const products = loadExternalProducts();
  assert.equal(products.get("clara-live")?.workspaceId, "synthetic-workspace");
  assert.equal(authenticateExternalProduct("clara-live", "Bearer synthetic-contract-token-not-a-secret", products)?.productId, "clara-live");
  assert.equal(authenticateExternalProduct("clara-live", "Bearer wrong", products), null);
  assert.equal(authenticateExternalProduct("wrong-product", "Bearer synthetic-contract-token-not-a-secret", products), null);
  assert.equal(authenticateExternalProduct("clara-live", null, products), null);
  assert.equal(authenticateExternalProduct("clara-live", "Basic synthetic-contract-token-not-a-secret", products), null);
  process.env.CLARA_LIVE_CAPABILITIES = "not-json";
  assert.throws(() => loadExternalProducts(), ExternalProductConfigurationError);
  console.log("PASS: Clara Live external authentication contract (synthetic credentials only)");
} finally { restore(); }
