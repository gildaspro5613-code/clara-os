import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { purgeDocumentOperations } from "@/lib/maintenance/document-operations-purge";
import { purgeRouteHarness } from "./helpers/document-operations-purge-route-harness";

const credential = "synthetic-maintenance-credential";
function request(authorization?: string) {
  return new Request("https://os.example/api/internal/document-operations-purge", {
    headers: authorization ? { authorization } : {},
  });
}

test("maintenance rejects missing/wrong auth, cookies, spoofed cron agent and query credentials without SQL access", async () => {
  let calls = 0;
  const route = purgeRouteHarness(async () => { calls++; return 1; }, credential);
  for (const auth of [undefined, "Bearer wrong", "Bearer synthetic-product-token", "Basic " + credential, credential, "bearer " + credential]) {
    assert.equal((await route.get(request(auth))).status, 401);
  }
  assert.equal((await route.get(new Request("https://os.example/api/internal/document-operations-purge?token=" + credential,
    { headers: { cookie: "session=synthetic", "user-agent": "vercel-cron/1.0" } }))).status, 401);
  for (const secret of [undefined, "", "  "]) {
    assert.equal((await purgeRouteHarness(async () => { calls++; return 1; }, secret).get(request("Bearer " + credential))).status, 401);
  }
  assert.equal(calls, 0);
  assert.equal(route.logs.length, 0);
});

test("authorized maintenance reports count/duration only, is uncached and repeats safely", async () => {
  let calls = 0;
  const route = purgeRouteHarness(async () => calls++ === 0 ? 1 : 0, credential);
  const first = await route.get(request("Bearer " + credential));
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal((await first.json()).expired_results_cleared, 1);
  assert.equal((await (await route.get(request("Bearer " + credential))).json()).expired_results_cleared, 0);
  assert.equal(route.logs.length, 2);
  assert.ok(route.logs.every((row) => row.status === "completed" && typeof row.duration_ms === "number"));
  assert.ok(!JSON.stringify(route.logs).includes(credential));
});

test("maintenance failure hides database errors, credentials and document contents", async () => {
  const route = purgeRouteHarness(async () => { throw new Error("private-db-url confidential-document " + credential); }, credential);
  const response = await route.get(request("Bearer " + credential));
  assert.equal(response.status, 503);
  const serialized = JSON.stringify({ body: await response.json(), logs: route.logs });
  for (const value of [credential, "private-db-url", "confidential-document"]) assert.ok(!serialized.includes(value));
  assert.equal(route.logs[0].status, "failed");
});

test("runtime reuses the exact reviewed SQL file as one atomic query with no request parameters", async () => {
  const expected = readFileSync(new URL("../../db/maintenance/purge_document_operations.sql", import.meta.url), "utf8")
    .replace(/^\s*--[^\n]*$/gm, "").trim().replace(/^BEGIN;\s*/, "").replace(/;\s*COMMIT;$/, "");
  const count = await purgeDocumentOperations(async (strings, ...values) => {
    assert.equal(strings.length, 1);
    assert.equal(strings[0], expected);
    assert.deepEqual(strings.raw, [expected]);
    assert.equal(values.length, 0);
    return [{ expired_results_cleared: "2" }];
  });
  assert.equal(count, 2);
  for (const value of [-1, 1.5, "NaN", {}, null, "9007199254740992"]) {
    await assert.rejects(purgeDocumentOperations(async () => [{ expired_results_cleared: value }]));
  }
});

test("one daily UTC cron targets only maintenance; SQL asset tracing is explicitly configured", () => {
  const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(config.crons, [{ path: "/api/internal/document-operations-purge", schedule: "0 3 * * *" }]);
  const next = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
  assert.ok(next.includes('"/api/internal/document-operations-purge": ["./db/maintenance/purge_document_operations.sql"]'));
});
