import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isolatedPostgres } from "./helpers/isolated-postgres";
import { createDocumentOperationStore, operationFingerprint, operationScopeKey } from "@/lib/external-capabilities/document-operations";

// Only an explicitly named, isolated Docker test database is supported here.
// Never reads DATABASE_URL, POSTGRES_URL, credentials or production records.
const container = process.env.DOCUMENT_OPERATION_TEST_CONTAINER;
const { runSql, query } = isolatedPostgres(container);

test("real PostgreSQL: additive migration, concurrency, fencing, crash recovery, scope, conflicts and retention", { skip: !container }, async () => {
  const migration = readFileSync(new URL("../../db/migrations/005_document_operations.sql", import.meta.url), "utf8");
  await runSql(migration);
  await runSql(migration); // Repeatable additive migration.
  await runSql("TRUNCATE clara_document_operations"); // Isolated synthetic database only.
  const store = createDocumentOperationStore(query);
  const scope = { productId: "clara-live", workspaceId: "project-a", userId: "user-a", sessionId: "session-a" };
  const key = operationScopeKey(scope, "default");
  const id = "a".repeat(64);
  const fingerprint = operationFingerprint({ scope, message: "synthetic document" });
  const reservations = await Promise.all(Array.from({ length: 12 }, () => store.reserve(key, id, fingerprint)));
  assert.equal(reservations.filter((result) => result.owned).length, 1);
  const owner = reservations.find((result) => result.owned)!.operation;
  const result = { response: "analyzed", sessionId: scope.sessionId, structuredResult: { documentAnalysis: { schemaVersion: "clara.document-analysis.v1", facts: [], entities: [], ambiguities: [], conflicts: [] } } };
  await assert.rejects(store.complete({ ...owner, owner_token: crypto.randomUUID() }, result));
  await runSql(`UPDATE clara_document_operations SET created_at = clock_timestamp() - interval '16 minutes' WHERE operation_id = '${id}'`);
  assert.equal((await store.lookup(key, id))!.status, "uncertain");
  assert.equal((await store.reserve(key, id, fingerprint)).owned, false);
  // The original invocation can finish even after it was marked uncertain.
  await store.complete(owner, result);
  assert.deepEqual((await store.lookup(key, id))!.result, result);
  await assert.rejects(store.complete(owner, { ...result, response: "overwrite" }));
  assert.equal((await store.reserve(key, id, operationFingerprint({ message: "changed" }))).operation.fingerprint, fingerprint);
  for (const field of ["productId", "workspaceId", "userId", "sessionId"] as const) {
    assert.equal(await store.lookup(operationScopeKey({ ...scope, [field]: "other" }, "default"), id), null);
  }
  assert.equal(await store.lookup(operationScopeKey(scope, "other-os-workspace"), id), null);
  await runSql(`UPDATE clara_document_operations SET expires_at = clock_timestamp() - interval '1 minute' WHERE operation_id = '${id}'`);
  assert.equal((await store.lookup(key, id))!.status, "expired");
  assert.equal((await store.lookup(key, id))!.result, null);
  assert.equal((await store.reserve(key, id, fingerprint)).owned, false);
  const failed = (await store.reserve(key, "b".repeat(64), fingerprint)).operation;
  await store.fail(failed);
  assert.equal((await store.lookup(key, failed.operation_id))!.status, "failed");
  assert.equal((await store.reserve(key, failed.operation_id, fingerprint)).owned, false);
});

test("canonical fingerprints ignore transport ordering and operation ID but cover scope and source changes", () => {
  assert.equal(operationFingerprint({ a: 1, b: { y: 2, x: 3 }, operationId: "a" }), operationFingerprint({ b: { x: 3, y: 2 }, a: 1 }));
  assert.notEqual(operationFingerprint({ documents: [{ text: "one" }] }), operationFingerprint({ documents: [{ text: "two" }] }));
});


test("real PostgreSQL: daily purge clears only expired JSON, preserves tombstones and is repeatable", { skip: !container }, async () => {
  await runSql(readFileSync(new URL("../../db/migrations/005_document_operations.sql", import.meta.url), "utf8"));
  const store = createDocumentOperationStore(query);
  const key = "d".repeat(64);
  const fingerprint = "e".repeat(64);
  const result = { response: "synthetic", sessionId: "synthetic-session", structuredResult: { documentAnalysis: { facts: [] } } };
  const expired = (await store.reserve(key, "1".repeat(64), fingerprint)).operation;
  const fresh = (await store.reserve(key, "2".repeat(64), fingerprint)).operation;
  const processing = (await store.reserve(key, "3".repeat(64), fingerprint)).operation;
  const failed = (await store.reserve(key, "4".repeat(64), fingerprint)).operation;
  const uncertain = (await store.reserve(key, "5".repeat(64), fingerprint)).operation;
  await store.complete(expired, result);
  await store.complete(fresh, result);
  await store.fail(failed);
  await runSql(`UPDATE clara_document_operations SET status = 'uncertain' WHERE scope_key = '${key}' AND operation_id = '${uncertain.operation_id}'`);
  await runSql(`UPDATE clara_document_operations SET expires_at = clock_timestamp() - interval '1 second' WHERE scope_key = '${key}' AND operation_id = '${expired.operation_id}'`);
  const maintenance = readFileSync(new URL("../../db/maintenance/purge_document_operations.sql", import.meta.url), "utf8");
  assert.equal((await runSql(maintenance)).trim(), "1");
  const rows = await query`SELECT * FROM clara_document_operations WHERE scope_key = ${key}`;
  const purged = rows.find((row) => row.operation_id === expired.operation_id)!;
  assert.equal(purged.result, null);
  assert.equal(purged.status, "expired");
  assert.equal(purged.fingerprint, fingerprint);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.find((row) => row.operation_id === fresh.operation_id)!.result, result);
  assert.equal(rows.find((row) => row.operation_id === processing.operation_id)!.status, "processing");
  assert.equal(rows.find((row) => row.operation_id === failed.operation_id)!.status, "failed");
  assert.equal(rows.find((row) => row.operation_id === uncertain.operation_id)!.status, "uncertain");
  assert.equal((await runSql(maintenance)).trim(), "0");
  assert.equal((await store.reserve(key, expired.operation_id, fingerprint)).owned, false);
  await assert.rejects(store.complete(expired, result));
});


test("Neon console procedure is validated locally on neondb and rolls back all synthetic rows", { skip: !container }, async () => {
  if (!(await runSql("SELECT 1 FROM pg_database WHERE datname = 'neondb'")).trim()) await runSql("CREATE DATABASE neondb");
  const { runSql: consoleSql } = isolatedPostgres(container, "neondb");
  await consoleSql(readFileSync(new URL("../../db/migrations/005_document_operations.sql", import.meta.url), "utf8"));
  const before = await consoleSql("SELECT count(*) FROM clara_document_operations");
  await consoleSql(readFileSync(new URL("../../db/validation/document_operations_005_synthetic.sql", import.meta.url), "utf8"));
  assert.equal(await consoleSql("SELECT count(*) FROM clara_document_operations"), before);
});
