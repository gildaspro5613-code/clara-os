/**
 * Integration test against a dedicated, pre-migrated PostgreSQL test database.
 * NEVER point CLARA_AUTH_TEST_DATABASE_URL at production.
 *
 * Run only with:
 * CLARA_AUTH_TEST_DATABASE_URL=<dedicated-db-url> CLARA_AUTH_TEST_DB_CONFIRM=isolated-test-only
 * npx tsx --test src/tests/integration/authenticated-workspace-db.test.ts
 *
 * No database access occurs unless both explicit opt-ins are provided.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { neon } from "@neondatabase/serverless";

const url = process.env.CLARA_AUTH_TEST_DATABASE_URL;
const enabled = Boolean(url && process.env.CLARA_AUTH_TEST_DB_CONFIRM === "isolated-test-only");

test("authenticated sessions and workspace permissions in isolated PostgreSQL", { skip: !enabled }, async () => {
  if (!url || !enabled) throw new Error("Dedicated test database opt-in required");
  // The production resolver uses DATABASE_URL. Never override or mutate it
  // here: this test queries the explicitly provided isolated database only.
  const db = neon(url);
  const { sessionTokenDigest } = await import("../../lib/auth/authenticated-workspace-session");
  const { authorizeWorkspace } = await import("../../lib/auth/workspace-authorization");
  const userA = `test-${randomUUID()}`;
  const userB = `test-${randomUUID()}`;
  const workspaceA = `test-${randomUUID()}`;
  const workspaceB = `test-${randomUUID()}`;
  const token = randomBytes(32).toString("base64url");
  const digest = sessionTokenDigest(token);
  assert.ok(digest);

  try {
    await db`INSERT INTO clara_auth_users (id) VALUES (${userA}), (${userB})`;
    await db`INSERT INTO clara_auth_workspaces (id) VALUES (${workspaceA}), (${workspaceB})`;
    await db`INSERT INTO clara_workspace_memberships (user_id, workspace_id, role)
      VALUES (${userA}, ${workspaceA}, 'admin'), (${userB}, ${workspaceB}, 'viewer')`;
    await db`INSERT INTO clara_auth_sessions (token_hash, user_id, expires_at)
      VALUES (${digest}, ${userA}, NOW() + INTERVAL '10 minutes')`;

    const active = await db`SELECT user_id FROM clara_auth_sessions
      WHERE token_hash = ${digest} AND revoked_at IS NULL AND expires_at > NOW()`;
    assert.equal(active[0]?.user_id, userA);

    const memberships = await db`SELECT workspace_id, role FROM clara_workspace_memberships
      WHERE user_id = ${userA} AND revoked_at IS NULL`;
    const principal = {
      userId: userA,
      memberships: memberships.map((m) => ({
        workspaceId: String(m.workspace_id),
        role: m.role as "admin",
      })),
    };
    assert.deepEqual(authorizeWorkspace(principal, workspaceA, "connections:manage"), {
      userId: userA, workspaceId: workspaceA,
    });
    assert.throws(() => authorizeWorkspace(principal, workspaceB, "connections:read"));

    await db`UPDATE clara_auth_sessions SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE token_hash = ${digest}`;
    const expired = await db`SELECT user_id FROM clara_auth_sessions
      WHERE token_hash = ${digest} AND revoked_at IS NULL AND expires_at > NOW()`;
    assert.equal(expired.length, 0);

    await db`UPDATE clara_auth_sessions SET expires_at = NOW() + INTERVAL '10 minutes',
      revoked_at = NOW() WHERE token_hash = ${digest}`;
    const revoked = await db`SELECT user_id FROM clara_auth_sessions
      WHERE token_hash = ${digest} AND revoked_at IS NULL AND expires_at > NOW()`;
    assert.equal(revoked.length, 0);
  } finally {
    // Remove only the randomly generated test records. Cascades clear
    // memberships and sessions belonging to these two test users.
    await db`DELETE FROM clara_auth_users WHERE id IN (${userA}, ${userB})`;
    await db`DELETE FROM clara_auth_workspaces WHERE id IN (${workspaceA}, ${workspaceB})`;
  }
});
