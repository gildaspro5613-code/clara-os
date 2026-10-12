import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("real OS/Live concurrency: reopen, commit, cancellation fence and crash recovery", {skip: !process.env.CANONICAL_TEST_CONTAINER, timeout:60000},()=>{
  assert.equal(process.env.CANONICAL_TEST_CONTAINER,"clara-canonical-test-postgres");
  const output=execFileSync(process.execPath,["--import","tsx","src/tests/helpers/canonical-integration.mts"],{encoding:"utf8",timeout:55000});
  const result=JSON.parse(output);
  assert.equal(result.status,"PASS");
  assert.equal(result.checks.length,18);
});
