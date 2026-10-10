import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createDocumentOperationStore, operationFingerprint, operationScopeKey } from "@/lib/external-capabilities/document-operations";
import { isolatedPostgres } from "./helpers/isolated-postgres";
import { routeHarness } from "./helpers/external-event-route-harness";
const container = process.env.DOCUMENT_OPERATION_TEST_CONTAINER;
const fixture = JSON.parse(readFileSync(new URL("./live-document-operation.fixture.json", import.meta.url), "utf8"));
const request = (body: unknown, token = "test-credential", product = "clara-live") => new Request("https://os.example/recovery", {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "x-clara-product": product }, body: JSON.stringify(body),
});

test("real PostgreSQL: pure reconciliation and immutable retry authorization, one reservation under concurrency", { skip: !container }, async () => {
  const { runSql, query } = isolatedPostgres(container);
  for (const file of ["005_document_operations.sql", "006_document_operation_retries.sql", "006_document_operation_retries.sql"])
    await runSql(readFileSync(new URL("../../db/migrations/" + file, import.meta.url), "utf8"));
  const store = createDocumentOperationStore(query);
  for (const state of ["completed", "processing", "uncertain", "failed", "expired"] as const) {
    const event = { ...fixture, operationId: undefined, scope: { ...fixture.scope, workspaceId: crypto.randomUUID() } };
    const parentId = crypto.randomUUID().replaceAll("-", "").repeat(2);
    const scopeKey = operationScopeKey(event.scope, "os-workspace");
    const fingerprint = operationFingerprint(event);
    const { operation } = await store.reserve(scopeKey, parentId, fingerprint);
    if (state === "completed") await store.complete(operation, { synthetic: true });
    else if (state !== "processing") await runSql(`UPDATE clara_document_operations SET status='${state}' WHERE scope_key='${scopeKey}'`);
    const route = routeHarness(false, store);
    const before = await runSql(`SELECT row_to_json(r) FROM clara_document_operations r WHERE scope_key='${scopeKey}'`);
    const inspect = await route.recoveryPost(request({ action: "inspect", event, operationId: parentId }));
    assert.equal(inspect.status, 200);
    const data = (await inspect.json()).data;
    assert.equal(data.status, state);
    assert.equal(data.retryEligible, state === "failed");
    assert.equal(await runSql(`SELECT row_to_json(r) FROM clara_document_operations r WHERE scope_key='${scopeKey}'`), before);
    assert.equal((await route.recoveryPost(request({ action: "inspect", event, operationId: parentId }, "wrong"))).status, 401);
    assert.equal((await route.recoveryPost(request({ action: "inspect", event, operationId: parentId }, "other-test-credential", "other-product"))).status, 403);
    assert.equal((await route.recoveryPost(request({ action: "inspect", event: { ...event, scope: { ...event.scope, userId: "foreign" } }, operationId: parentId }))).status, 404);
    assert.equal((await route.recoveryPost(request({ action: "authorize", confirm: false, event, operationId: parentId }))).status, 409);
    assert.equal((await route.recoveryPost(request({ action: "authorize", confirm: true, event: { ...event, message: "changed source" }, operationId: parentId }))).status, 409);
    assert.equal((await route.post(request({ ...event, operationId: store.retryId(scopeKey, parentId) }))).status, 409);
    assert.equal(route.metrics.documentAnalyses, 0);
    const responses = await Promise.all(Array.from({ length: 12 }, () => route.recoveryPost(request({ action: "authorize", confirm: true, event, operationId: parentId }))));
    if (state !== "failed") { assert.ok(responses.every(r => r.status === 409)); continue; }
    const ids = await Promise.all(responses.map(async r => { assert.equal(r.status, 200); return (await r.json()).data.attemptId; }));
    assert.equal(new Set(ids).size, 1);
    const attemptId = ids[0];
    assert.notEqual(attemptId, parentId);
    assert.equal((await route.post(request({ ...event, operationId: attemptId }))).status, 409);
    assert.equal(route.metrics.documentAnalyses, 0);
    const reservations = await Promise.all(Array.from({ length: 12 }, () => store.reserveRetry(scopeKey, attemptId, parentId, fingerprint)));
    assert.equal(reservations.filter(r => r.owned).length, 1);
    await assert.rejects(store.reserveRetry(scopeKey, "a".repeat(64), parentId, fingerprint));
    const changedFingerprint = operationFingerprint({ ...event, message: "changed" });
    assert.notEqual((await store.reserveRetry(scopeKey, attemptId, parentId, changedFingerprint)).operation.fingerprint, changedFingerprint);
    assert.equal((await route.post(request({ ...event, message: "changed", operationId: attemptId, retryOf: parentId }))).status, 409);
    await store.complete(reservations.find(r => r.owned)!.operation, { synthetic: true });
    assert.equal((await store.inspect(scopeKey, parentId))!.status, "failed");
    assert.equal((await store.reserveRetry(scopeKey, attemptId, parentId, fingerprint)).owned, false);
    assert.equal(await runSql(`SELECT count(*) FROM clara_document_operation_retries WHERE scope_key='${scopeKey}'`), "1\n");
    await assert.rejects(store.complete(operation, { synthetic: true }));
  }
});

test("real PostgreSQL: inspection cannot erase an expired result or steal a stale lease", { skip: !container }, async () => {
  const { runSql, query } = isolatedPostgres(container);
  const store = createDocumentOperationStore(query);
  const scope = { productId: "clara-live", workspaceId: crypto.randomUUID(), userId: "synthetic", sessionId: "synthetic" };
  const key = operationScopeKey(scope, "os-workspace");
  const id = crypto.randomUUID().replaceAll("-", "").repeat(2);
  const { operation } = await store.reserve(key, id, "a".repeat(64));
  await runSql(`UPDATE clara_document_operations SET created_at=clock_timestamp()-interval '16 minutes' WHERE scope_key='${key}'`);
  assert.equal((await store.inspect(key, id))!.status, "uncertain");
  assert.equal((await runSql(`SELECT status FROM clara_document_operations WHERE scope_key='${key}'`)).trim(), "processing");
  await store.complete(operation, { synthetic: true });
  await runSql(`UPDATE clara_document_operations SET expires_at=clock_timestamp()-interval '1 second' WHERE scope_key='${key}'`);
  const expired = await store.inspect(key, id);
  assert.equal(expired!.status, "expired"); assert.equal(expired!.result, null);
  assert.equal((await runSql(`SELECT status || ':' || (result IS NOT NULL)::text FROM clara_document_operations WHERE scope_key='${key}'`)).trim(), "completed:true");
  await assert.rejects(store.authorizeRetry(key, id, "a".repeat(64), "synthetic"));
});
