import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createDocumentOperationStore, operationFingerprint, operationScopeKey, type DocumentOperation } from "@/lib/external-capabilities/document-operations";

// Only an explicitly named, isolated Docker test database is supported here.
// Never reads DATABASE_URL, POSTGRES_URL, credentials or production records.
const container = process.env.DOCUMENT_OPERATION_TEST_CONTAINER;
const exec = promisify(execFile);
async function runSql(statement: string) {
  if (!container || !/^clara-document-registry-test(?:-[a-z0-9]+)?$/.test(container)) throw new Error("Invalid isolated test container");
  const { stdout } = await exec("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", statement]);
  return stdout;
}
async function query(strings: TemplateStringsArray, ...values: unknown[]): Promise<DocumentOperation[]> {
  const statement = strings.reduce((text, segment, index) => text + segment + (index < values.length
    ? "'" + String(values[index]).replaceAll("'", "''") + "'" : ""), "").trim();
  const returnsRows = /RETURNING \*/.test(statement) || /^SELECT /.test(statement);
  const sql = returnsRows ? (statement.startsWith("SELECT")
    ? `SELECT row_to_json(rows) FROM (${statement}) rows`
    : `WITH rows AS (${statement}) SELECT row_to_json(rows) FROM rows`) : statement;
  const output = await runSql(sql);
  return returnsRows ? output.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
}

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
