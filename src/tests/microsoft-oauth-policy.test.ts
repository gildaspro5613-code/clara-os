import assert from "node:assert/strict";
import test from "node:test";

test("Windows 365 connector requires organizational delegated scopes", async () => {
  const { MICROSOFT_OAUTH_SCOPES } = await import("../lib/connectors/microsoft/oauth/microsoft-oauth");
  assert.ok(MICROSOFT_OAUTH_SCOPES.includes("User.Read"));
  assert.ok(MICROSOFT_OAUTH_SCOPES.includes("CloudPC.Read.All"));
  assert.ok(MICROSOFT_OAUTH_SCOPES.includes("offline_access"));
  assert.equal(MICROSOFT_OAUTH_SCOPES.includes("CloudPC.ReadWrite.All" as never), false);
});
