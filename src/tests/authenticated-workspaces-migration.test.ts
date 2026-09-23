import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static safety checks; never connects to PostgreSQL or applies the migration.
 * A dedicated test database and identity provisioning review remain required.
 */
const migration = readFileSync(
  resolve(process.cwd(), "db/migrations/001_authenticated_workspaces.sql"),
  "utf8",
);

test("authenticated workspace migration is transactional and creates four scoped tables", () => {
  assert.match(migration, /\bBEGIN\s*;/);
  assert.match(migration, /\bCOMMIT\s*;/);
  for (const table of [
    "clara_auth_users",
    "clara_auth_workspaces",
    "clara_workspace_memberships",
    "clara_auth_sessions",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  }
});

test("migration rejects legacy default workspace and restricts roles", () => {
  assert.match(migration, /CHECK\s*\(id\s*<>\s*'default'\)/);
  assert.match(migration, /CHECK\s*\(role IN\s*\('owner',\s*'admin',\s*'member',\s*'viewer'\)\)/);
});

test("sessions store hashes and support expiry and revocation", () => {
  assert.match(migration, /token_hash CHAR\(64\) PRIMARY KEY/);
  assert.match(migration, /expires_at TIMESTAMPTZ NOT NULL/);
  assert.match(migration, /revoked_at TIMESTAMPTZ/);
  assert.doesNotMatch(migration, /\b(token_plaintext|password|client_secret)\b/i);
});

test("migration contains no existing legacy table alteration or data seed", () => {
  // Check SQL statement beginnings only. ON DELETE CASCADE is a valid
  // foreign-key constraint, not a data-deletion statement.
  const statements = migration
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    assert.doesNotMatch(
      statement,
      /^(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE|INSERT)\b/i,
    );
  }
});
