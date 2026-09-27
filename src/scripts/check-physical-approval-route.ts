import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../app/api/clara/physical-actions/approve/route.ts", import.meta.url),
  "utf8",
);

assert.match(source, /status:\s*503/);
assert.match(source, /AUTHENTICATED_OPERATOR_UNAVAILABLE/);
assert.doesNotMatch(source, /authorizeApprovedPhysicalAction\s*\(/);
assert.doesNotMatch(source, /executeAuthorizedPhysicalAction\s*\(/);

console.log("Physical approval route fail-closed contract: OK");
