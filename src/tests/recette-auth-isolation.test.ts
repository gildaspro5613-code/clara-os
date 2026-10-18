import assert from "node:assert/strict";
import test from "node:test";
import { readAuthCookie } from "../lib/auth/canonical-request-authorization";
import { sessionTokenDigest } from "../lib/auth/authenticated-workspace-session";
import { authorizeWorkspace, WorkspaceAuthorizationError } from "../lib/auth/workspace-authorization";
import { createNativeAuthority, nativeSelectors } from "../lib/native/authority";
import { RegistryError } from "../lib/canonical/registry";

const TOKEN = "a".repeat(43);
const COOKIE = `clara_auth_session=${TOKEN}`;
const BASE = "https://recette.invalid/api/native/runtime";
function request(params: string, cookie: string | null = COOKIE): Request {
  return new Request(`${BASE}?${params}`, { headers: cookie === null ? {} : {cookie} });
}
const SCOPE = "workspaceId=workspace-fictional&clientId=client-fictional&projectId=project-fictional&sessionId=native%3Afictional";

test("AUTH-01/02: missing, malformed and duplicated canonical cookie are denied", () => {
  for (const header of [null, "", "other=value", "clara_auth_session=short", `${COOKIE}; ${COOKIE}`, `${COOKIE}; clara_auth_session=${"b".repeat(43)}`]) {
    assert.equal(readAuthCookie(header), undefined);
    assert.throws(() => nativeSelectors(request(SCOPE, header)), (error: unknown) => error instanceof RegistryError && error.status === 401);
  }
  assert.equal(readAuthCookie(COOKIE), TOKEN);
  assert.equal(sessionTokenDigest("short"), null);
  assert.match(sessionTokenDigest(TOKEN) ?? "", /^[a-f0-9]{64}$/);
});

test("AUTH-04/SCOPE-01: membership and role authorization cannot cross workspaces", () => {
  const principal = {userId:"fictional-user",memberships:[{workspaceId:"workspace-fictional",role:"viewer" as const}]};
  assert.deepEqual(authorizeWorkspace(principal,"workspace-fictional","connections:read"),{userId:"fictional-user",workspaceId:"workspace-fictional"});
  for (const [actor,workspace,permission] of [
    [null,"workspace-fictional","connections:read"],
    [principal,"workspace-other","connections:read"],
    [principal,"workspace-fictional","connections:manage"],
    [{userId:"fictional-user",memberships:[]},"workspace-fictional","connections:read"],
  ] as const) assert.throws(() => authorizeWorkspace(actor,workspace,permission), WorkspaceAuthorizationError);
});

test("SCOPE-02/03: incomplete, duplicated and malformed native selectors are denied before SQL", async () => {
  let sqlCalls = 0;
  const read = createNativeAuthority(async () => {sqlCalls++; return [{data:{}}];});
  for (const params of [
    "workspaceId=workspace-fictional&clientId=client-fictional&projectId=project-fictional",
    `${SCOPE}&workspaceId=workspace-other`,
    SCOPE.replace("project-fictional","default"),
    SCOPE.replace("native%3Afictional","external%3Aforeign"),
    SCOPE.replace("client-fictional","client%2Fforeign"),
  ]) await assert.rejects(() => read(request(params)), RegistryError);
  assert.equal(sqlCalls,0);
});

test("SCOPE-01/04: SQL native authority denies foreign or unrelated sessions, never falling back", async () => {
  let sqlCalls = 0;
  const read = createNativeAuthority(async () => {sqlCalls++; return [{data:null}];});
  await assert.rejects(() => read(request(SCOPE)), (error: unknown) => error instanceof RegistryError && error.status === 403 && error.code === "NATIVE_SCOPE_DENIED");
  assert.equal(sqlCalls,1);
});

test("AUTH-03: expiration and revocation must be enforced by database, not inferred from token format", () => {
  assert.equal(typeof sessionTokenDigest(TOKEN), "string");
  // Actual expired/revoked session checks require the isolated database fixture and remain NO-GO.
});
