import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { readAuthCookie } from "../lib/connectors/microsoft/security/request-authorization";
import { authorizeWorkspace } from "../lib/auth/workspace-authorization";

test("Microsoft session cookie remains opaque and duplicate-safe", () => {
  const token = randomBytes(32).toString("base64url");
  assert.equal(readAuthCookie(`clara_auth_session=${token}`), token);
  assert.equal(readAuthCookie(`clara_auth_session=${token}; clara_auth_session=${token}`), undefined);
});

test("Windows 365 read is allowed to a member but connection management is not", () => {
  const principal = { userId: "user-1", memberships: [{ workspaceId: "workspace-1", role: "member" as const }] };
  assert.deepEqual(authorizeWorkspace(principal, "workspace-1", "connections:read"), {
    userId: "user-1", workspaceId: "workspace-1",
  });
  assert.throws(() => authorizeWorkspace(principal, "workspace-1", "connections:manage"));
});

test("Microsoft connection management is restricted to owner/admin membership", () => {
  for (const role of ["owner", "admin"] as const) {
    assert.deepEqual(authorizeWorkspace({
      userId: "user-1", memberships: [{ workspaceId: "workspace-1", role }],
    }, "workspace-1", "connections:manage"), { userId: "user-1", workspaceId: "workspace-1" });
  }
});

test("Microsoft authorization never accepts the legacy default workspace", () => {
  assert.throws(() => authorizeWorkspace({
    userId: "user-1", memberships: [{ workspaceId: "default", role: "owner" }],
  }, "default", "connections:read"));
});
