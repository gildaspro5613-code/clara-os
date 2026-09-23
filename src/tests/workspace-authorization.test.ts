import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeWorkspace,
  WorkspaceAuthorizationError,
  type AuthenticatedWorkspacePrincipal,
} from "../lib/auth/workspace-authorization";

const principal: AuthenticatedWorkspacePrincipal = {
  userId: "user-a",
  memberships: [
    { workspaceId: "workspace-a", role: "admin" },
    { workspaceId: "workspace-b", role: "viewer" },
  ],
};

test("anonymous and legacy default workspace are denied", () => {
  assert.throws(() => authorizeWorkspace(null, "workspace-a", "connections:read"), WorkspaceAuthorizationError);
  assert.throws(() => authorizeWorkspace(principal, "default", "connections:read"), WorkspaceAuthorizationError);
});

test("membership prevents cross-workspace connection access", () => {
  assert.deepEqual(authorizeWorkspace(principal, "workspace-a", "connections:manage"), {
    userId: "user-a", workspaceId: "workspace-a",
  });
  assert.throws(() => authorizeWorkspace(principal, "workspace-c", "connections:read"), WorkspaceAuthorizationError);
});

test("read-only members cannot manage connections", () => {
  assert.deepEqual(authorizeWorkspace(principal, "workspace-b", "connections:read"), {
    userId: "user-a", workspaceId: "workspace-b",
  });
  assert.throws(() => authorizeWorkspace(principal, "workspace-b", "connections:manage"), WorkspaceAuthorizationError);
});
