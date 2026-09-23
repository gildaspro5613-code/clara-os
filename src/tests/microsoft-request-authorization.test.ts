import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { readAuthCookie, authorizeMicrosoftRequest } from "../lib/connectors/microsoft/security/request-authorization";

const valid = randomBytes(32).toString("base64url");

test("Microsoft auth cookie rejects missing, duplicate and malformed tokens", () => {
  assert.equal(readAuthCookie(null), undefined);
  assert.equal(readAuthCookie("other=value"), undefined);
  assert.equal(readAuthCookie("clara_auth_session=short"), undefined);
  assert.equal(readAuthCookie(`clara_auth_session=${valid}; clara_auth_session=${valid}`), undefined);
  assert.equal(readAuthCookie(`other=x; clara_auth_session=${valid}`), valid);
});

test("Microsoft authorization rejects anonymous requests without touching DB", async () => {
  assert.equal(await authorizeMicrosoftRequest(null, "workspace-a", "connections:read"), null);
  assert.equal(await authorizeMicrosoftRequest("clara_auth_session=invalid", "workspace-a", "connections:manage"), null);
});
