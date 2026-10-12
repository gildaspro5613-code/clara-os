import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createLiveArchiveStore, LiveArchiveConflictError, type ArchiveQuery } from "@/lib/documents/live-archive-store";
import { parseLiveArchiveReference } from "@/lib/documents/live-archive-reference";
import { randomUUID } from "node:crypto";

const container = process.env.DOCUMENT_ARCHIVE_TEST_CONTAINER;
const exec = promisify(execFile);
test("isolated PostgreSQL: persistence, idempotence, immutable conflicts and client/workspace isolation", { skip: !container }, async () => {
  if (!/^clara-document-registry-test(?:-[a-z0-9]+)?$/.test(container!)) throw new Error("Not an isolated test database");
  const record = { version: "clara.live-archive-reference.v1", workspaceId: `synthetic-os-${randomUUID()}`, clientId: "synthetic-client", projectId: "synthetic-project", liveProjectId: "synthetic-live", productId: "clara-live", status: "archived", archivedAt: "2026-10-11T10:00:00Z", displayName: "Synthetic archive" };
  const query: ArchiveQuery = async (strings, ...values) => {
    const statement = strings.reduce((text, segment, index) => text + segment + (index < values.length ? "'" + String(values[index]).replaceAll("'", "''") + "'" : ""), "").trim();
    const rows = /^SELECT\b/.test(statement) || /\bRETURNING\b/.test(statement);
    const command = rows ? (/^SELECT\b/.test(statement) ? `SELECT row_to_json(r) FROM (${statement}) r` : `WITH r AS (${statement}) SELECT row_to_json(r) FROM r`) : statement;
    try {
      const { stdout } = await exec("docker", ["exec", container!, "psql", "-U", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-c", command]);
      return rows ? stdout.trim().split("\n").filter(Boolean).map(line => JSON.parse(line)) : [];
    } catch (error) {
      if (error && typeof error === "object" && "stderr" in error && String(error.stderr).includes("23505")) throw Object.assign(new Error("Unique conflict"), { code: "23505" });
      throw error;
    }
  };
  const first = createLiveArchiveStore(query);
  const saved = await first.saveLiveArchiveReference(record);
  assert.deepEqual(saved, parseLiveArchiveReference(record));
  assert.deepEqual(await first.saveLiveArchiveReference(record), saved);
  // A fresh store has no in-memory record: re-read actual database persistence.
  const second = createLiveArchiveStore(query);
  assert.deepEqual(await second.listLiveArchiveReferences(record.workspaceId, record.clientId), [saved]);
  assert.deepEqual(await second.listLiveArchiveReferences("other-workspace", record.clientId), []);
  assert.deepEqual(await second.listLiveArchiveReferences(record.workspaceId, "other-client"), []);
  for (const change of [{ projectId: "conflict" }, { displayName: "Changed" }, { clientId: "other-client" }]) {
    await assert.rejects(second.saveLiveArchiveReference({ ...record, ...change }), LiveArchiveConflictError);
  }
  await second.saveLiveArchiveReference({ ...record, projectId: "returning-project", liveProjectId: "returning-live" });
  assert.equal((await second.listLiveArchiveReferences(record.workspaceId, record.clientId)).length, 2);
  assert.equal((await second.listLiveArchiveReferences(record.workspaceId, record.clientId, 1)).length, 1);
  await assert.rejects(second.listLiveArchiveReferences(record.workspaceId, record.clientId, NaN));
});
