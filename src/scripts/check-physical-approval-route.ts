import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const source = await readFile(
    resolve(process.cwd(), "src/app/api/clara/physical-actions/approve/route.ts"),
    "utf8",
  );
  
  assert.ok(source.includes("status: 503"));
  assert.ok(source.includes("AUTHENTICATED_OPERATOR_UNAVAILABLE"));
  assert.equal(source.includes("import { authorizeApprovedPhysicalAction"), false);
  assert.equal(source.includes("import { executeAuthorizedPhysicalAction"), false);
  assert.equal(source.includes("await executeAuthorizedPhysicalAction("), false);
  
  console.log("Physical approval route fail-closed contract: OK");
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
