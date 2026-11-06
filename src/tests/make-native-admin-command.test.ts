import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nativeMakeAdminCommands } from "@/lib/native/make-admin-command";

const candidate = readFileSync("docs/operations/native-make-admin-command-clone-candidate.sql", "utf8");

test("native Make admin grant/revoke fails closed outside an authenticated native scope", async () => {
  let calls = 0;
  const query = async () => { calls++; return []; };
  await assert.rejects(
    () => nativeMakeAdminCommands(query as never)("grant", {
      connectionId: "fixture",
      ownerUserId: "owner",
      scenarioKey: "find-drive-document",
      reason: "Fixture-only authority review",
    }),
    (e: unknown) => e instanceof Error && e.message.includes("NATIVE_MAKE_ADMIN_SCOPE_REQUIRED"),
  );
  assert.equal(calls, 0);
});

test("clone-only SQL candidate requires canonical authority and explicit READ-only grant", () => {
  assert.match(candidate, /clara_native_runtime_command\(digest,w,c,p,s,'read'/);
  assert.match(candidate, /view->>'canWrite'/);
  assert.match(candidate, /wm\.role IN \('owner','admin'\)/);
  assert.match(candidate, /ca\.can_manage/);
  assert.match(candidate, /pa\.can_manage/);
  assert.match(candidate, /ca\.can_read/);
  assert.match(candidate, /pa\.can_read/);
  assert.match(candidate, /co\.provider='make'/);
  assert.match(candidate, /co\.status='ACTIVE'/);
  assert.match(candidate, /make:scenario:/);
  assert.match(candidate, /v_scenario_key NOT IN \('find-drive-document','check-calendar-availability','search-calendar-events'\)/);
  assert.match(candidate, /pg_advisory_xact_lock/);
  assert.match(candidate, /revision=a\.revision\+1,revoked_at=NOW\(\)/);
  assert.match(candidate, /clara_native_make_admin_audit/);
  assert.match(candidate, /REVOKE ALL ON FUNCTION/);
  assert.match(candidate, /REVOKE ALL ON TABLE/);
  assert.match(candidate, /NOT A PRODUCTION MIGRATION/);
});
