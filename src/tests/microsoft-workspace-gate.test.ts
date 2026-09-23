import assert from "node:assert/strict";
import test from "node:test";
import { microsoftWorkspaceGate } from "../lib/connectors/microsoft/security/workspace-gate";

/**
 * Security regression: until Clara OS has an authenticated principal and
 * authorized workspace membership, Microsoft routes must not expose data.
 * This test requires no Microsoft tenant, credentials or customer account.
 */
test("Microsoft workspace gate fails closed without authenticated workspace", async () => {
  const response = microsoftWorkspaceGate();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    error: "MICROSOFT_WORKSPACE_AUTH_REQUIRED",
    message: "Microsoft connector activation requires authenticated workspace isolation.",
  });
  assert.equal(response.headers.get("location"), null);
});
