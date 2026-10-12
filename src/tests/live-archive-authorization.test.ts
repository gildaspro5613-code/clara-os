import test from "node:test";
import assert from "node:assert/strict";
import { verifyLiveArchiveAuthorization, LiveArchiveAuthorizationError, type LiveArchiveAuthorization } from "@/lib/documents/live-archive-authorization";
import { parseLiveArchiveReference } from "@/lib/documents/live-archive-reference";

const now = Date.parse("2026-10-11T10:00:00Z");
const reference = parseLiveArchiveReference({ version: "clara.live-archive-reference.v1", productId: "clara-live", status: "archived", workspaceId: "os-workspace", clientId: "client", projectId: "project", liveProjectId: "live-project", archivedAt: new Date(now).toISOString(), displayName: "Completed project" });
const principal = { userId: "verified-user", workspaceId: "os-workspace" };
const grant: LiveArchiveAuthorization = { schemaVersion: "clara.live-archive-authorization.v1", productId: "clara-live", osUserId: principal.userId, workspaceId: reference.workspaceId, clientId: reference.clientId, projectId: reference.projectId, liveProjectId: reference.liveProjectId, status: "completed", completedAt: new Date(now - 86_400_000).toISOString(), verifiedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 59_000).toISOString(), displayName: reference.displayName, permissions: { workspace: true, client: true, project: true, read: true, archive: true } };
test("future pure gate accepts matching authenticated principal and trusted completed-project grant", () => {
  verifyLiveArchiveAuthorization(reference, principal, grant, "archive", now);
  verifyLiveArchiveAuthorization(reference, principal, grant, "read", now);
});
test("future gate denies missing authentication, other user and other workspace", () => {
  for (const p of [null, { ...principal, userId: "other-user" }, { ...principal, workspaceId: "other-workspace" }]) {
    assert.throws(() => verifyLiveArchiveAuthorization(reference, p, grant, "archive", now), LiveArchiveAuthorizationError);
  }
});
test("future gate denies client/project identity substitution, expired grants and uncompleted projects", () => {
  for (const change of [
    { clientId: "other-client" }, { projectId: "other-project" }, { liveProjectId: "other-live" },
    { status: "active" }, { expiresAt: new Date(now).toISOString() },
    { completedAt: new Date(now + 1000).toISOString() }, { expiresAt: new Date(now + 120_000).toISOString() },
    { sourceUrl: "https://untrusted.example.test" },
  ]) assert.throws(() => verifyLiveArchiveAuthorization(reference, principal, { ...grant, ...change } as LiveArchiveAuthorization, "archive", now), LiveArchiveAuthorizationError);
});
test("future gate checks all three access scopes and distinguishes read from archive", () => {
  for (const scope of ["workspace", "client", "project", "archive"] as const) {
    assert.throws(() => verifyLiveArchiveAuthorization(reference, principal, { ...grant, permissions: { ...grant.permissions, [scope]: false } }, "archive", now), LiveArchiveAuthorizationError);
  }
  const readOnly = { ...grant, permissions: { ...grant.permissions, archive: false } };
  verifyLiveArchiveAuthorization(reference, principal, readOnly, "read", now);
  assert.throws(() => verifyLiveArchiveAuthorization(reference, principal, readOnly, "archive", now));
});
test("authorized history remains readable after project metadata changes", () => {
  const renamed = { ...grant, displayName: "Renamed project", sourceUrl: "https://live.example.test/projects/live-project" };
  verifyLiveArchiveAuthorization(reference, principal, renamed, "read", now);
  assert.throws(() => verifyLiveArchiveAuthorization(reference, principal, renamed, "archive", now));
});
