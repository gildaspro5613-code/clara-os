import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { routeHarness } from "./helpers/external-event-route-harness";

const fixture = JSON.parse(readFileSync(new URL("./live-document-operation.fixture.json", import.meta.url), "utf8"));
const valid = JSON.stringify({ entities: [], facts: [], ambiguities: [], conflicts: [] });
const request = () => new Request("https://os.example/api/external/events", { method: "POST", headers: {
  "x-clara-product": "clara-live", authorization: "Bearer test-credential", "x-clara-correlation-id": "b".repeat(32),
}, body: JSON.stringify({ ...fixture, operationId: undefined }) });

test("document output budget is honored while other callers retain their ceiling; incomplete metadata survives", async () => {
  const requests: Record<string, unknown>[] = [];
  let failure: Error | undefined;
  class APIError extends Error { status = 429; }
  class APIConnectionError extends Error {}
  class APIConnectionTimeoutError extends APIConnectionError {}
  class Client {
    static APIError = APIError;
    static APIConnectionError = APIConnectionError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
    responses = { create: async (input: Record<string, unknown>) => {
      requests.push(input);
      if (failure) throw failure;
      return { output: [], output_text: '{"entities":', status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" }, usage: { output_tokens: input.max_output_tokens } };
    } };
  }
  const source = readFileSync(new URL("../lib/connectors/internal/openai/responses/openai-responses-engine.ts", import.meta.url), "utf8");
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: () => ({ default: Client }), process: { env: {} }, Date });
  const Engine = exports.OpenAIResponsesEngine as new () => { generate(context: Record<string, unknown>): Promise<Record<string, unknown>> };
  const engine = new Engine();
  const incomplete = await engine.generate({ prompt: "synthetic", maxTokens: 6000, outputProfile: "document_analysis" });
  assert.equal(requests[0].max_output_tokens, 6000);
  assert.equal(incomplete.responseStatus, "incomplete");
  assert.equal(incomplete.incompleteReason, "max_output_tokens");
  await engine.generate({ prompt: "synthetic", maxTokens: 6000 });
  assert.equal(requests[1].max_output_tokens, 2000);
  await engine.generate({ prompt: "synthetic" });
  assert.equal(requests[2].max_output_tokens, 1200);
  for (const [error, expected] of [
    [new APIConnectionTimeoutError("private-timeout"), "provider_timeout"],
    [new APIConnectionError("private-connection"), "provider_connection"],
    [Object.assign(new APIError("private-auth"), { status: 401 }), "provider_auth"],
    [new APIError("private-rate-limit"), "provider_rate_limit"],
    [Object.assign(new APIError("private-server"), { status: 503 }), "provider_server"],
    [Object.assign(new APIError("private-request"), { status: 400 }), "provider_request"],
    [new Error("private-unknown"), "provider_unknown"],
  ] as const) {
    failure = error;
    const failed = await engine.generate({ prompt: "synthetic", outputProfile: "document_analysis" });
    assert.equal(failed.success, false);
    assert.equal(failed.failureCategory, expected);
    assert.ok(!String(failed.failureCategory).includes("private"));
  }
});

test("document failures retain real 500 and safe correlated categories, never fake success", async () => {
  const cases = [
    { result: { success: true, content: '{"entities":', responseStatus: "incomplete" as const, incompleteReason: "max_output_tokens" as const }, category: "output_truncated" },
    { result: { success: false, content: "", failureCategory: "provider_timeout" as const }, category: "provider_timeout" },
    { result: { success: false, content: "", failureCategory: "provider_rate_limit" as const, providerHttpStatus: 429 }, category: "provider_rate_limit" },
    { result: { success: false, content: "", failureCategory: "provider_auth" as const, providerHttpStatus: 401 }, category: "provider_auth" },
    { result: { success: true, content: "private-malformed-output" }, category: "invalid_json" },
    { result: { success: true, content: "{}" }, category: "invalid_structure" },
    { result: { success: true, content: "" }, category: "empty_output" },
    { result: { success: true, content: valid, responseStatus: "incomplete" as const, incompleteReason: "content_filter" as const }, category: "output_filtered" },
  ];
  for (const { result, category } of cases) {
    const route = routeHarness(false, undefined, false, async () => result);
    assert.equal((await route.post(request())).status, 500);
    const failure = route.logs.find(row => row.event === "processing_failed");
    assert.equal(failure?.failure_category, category);
    assert.equal(failure?.phase, "document_analysis");
    assert.equal(failure?.correlation_id, "b".repeat(32));
    assert.equal(route.logs.at(-1)?.http_status, 500);
    const logs = JSON.stringify(route.logs);
    for (const confidential of ["test-credential", "private-malformed-output", "synthetic confidential content"]) assert.ok(!logs.includes(confidential));
  }
  const unexpected = routeHarness(false, undefined, false, async () => { throw new Error("secret-provider-message"); });
  assert.equal((await unexpected.post(request())).status, 500);
  assert.equal(unexpected.logs.find(row => row.event === "processing_failed")?.failure_category, "unexpected_exception");
  assert.ok(!JSON.stringify(unexpected.logs).includes("secret-provider-message"));
  const completed = routeHarness(false, undefined, false, async () => ({ success: true, content: valid, responseStatus: "completed" }));
  assert.equal((await completed.post(request())).status, 200);
});
