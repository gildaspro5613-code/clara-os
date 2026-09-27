import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const source = await readFile(
    resolve(process.cwd(), "src/app/api/clara/physical-actions/approve/route.ts"),
    "utf8",
  );
  
  assert.ok(source.includes("resolveAuthenticatedOperator"));
  assert.ok(source.includes("isSameOriginRequest"));
  assert.ok(source.includes("AUTHENTICATED_OPERATOR_REQUIRED"));
  assert.ok(source.includes("PostgresPhysicalActionProposalStore"));
  assert.ok(source.includes("consumeApprovedPhysicalAction"));
  assert.ok(source.includes("AUTHENTICATED_OPERATOR_UNAVAILABLE"));
  assert.equal(source.includes("executeAuthorizedPhysicalAction"), false);
  assert.ok(source.includes("commandSent: false"));
  assert.ok(source.includes("physicalExecutionConfirmed: false"));
  
  
  console.log("Physical approval route durable authorization boundary: OK");
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
