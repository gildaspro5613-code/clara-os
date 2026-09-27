import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const source = await readFile(resolve(process.cwd(),
    "src/lib/connectors/clara-live/postgres-physical-action-store.ts"), "utf8");
  assert.ok(source.includes("UPDATE clara_physical_action_proposals"));
  assert.ok(source.includes("consumed_at IS NULL"));
  assert.ok(source.includes("expires_at > NOW()"));
  assert.ok(source.includes("RETURNING id"));
  assert.ok(source.includes("workspace_id ="));
  console.log("PostgreSQL physical proposal one-shot contract: OK");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
