import assert from "node:assert/strict";
import { authorizeClaraLiveExecution } from "../lib/connectors/clara-live/execution-authority";

async function main(): Promise<void> {
  const previousBase = process.env.CLARA_LIVE_BASE_URL;
  const previousToken = process.env.CLARA_OS_PRODUCT_TOKEN;
  try {
    process.env.CLARA_LIVE_BASE_URL = "https://clara-live.example.test";
    process.env.CLARA_OS_PRODUCT_TOKEN = "test-secret";

    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const transport = async (url: string, init: RequestInit): Promise<Response> => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(JSON.stringify({
        command_id: "cmd-1",
        state: "QUEUED",
        phase: "EXECUTE",
        authorization_source: "clara-os",
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const receipt = await authorizeClaraLiveExecution({
      agentId: "agent-1",
      connector: "chamsys_mq50",
      capability: "playback_level",
      parameters: { playback: 1, level: 37 },
      sessionId: "session-1",
    }, transport);

    assert.equal(receipt.command_id, "cmd-1");
    assert.match(capturedUrl, /\/connector-runtime\/os\/agents\/agent-1\/commands$/);
    const capturedHeaders = new Headers(capturedInit?.headers);
    assert.equal(capturedHeaders.get("Authorization"), "Bearer test-secret");
    assert.equal(capturedHeaders.get("x-clara-product"), "clara-os");

    const payload = JSON.parse(String(capturedInit?.body));
    assert.equal(payload.phase, "EXECUTE");
    assert.equal(payload.session_id, "session-1");
    assert.match(payload.execution_authorization_id, /^exec_/);
    assert.equal(typeof payload.expires_at, "string");
    const ttlMs = Date.parse(payload.expires_at) - Date.now();
    assert.ok(ttlMs > 0 && ttlMs <= 2 * 60_000, "execution authority must be short-lived");

    const firstAuthorization = payload.execution_authorization_id;
    let secondAuthorization = "";
    await authorizeClaraLiveExecution({
      agentId: "agent-1",
      connector: "chamsys_mq50",
      capability: "playback_level",
      parameters: { playback: 1, level: 37 },
      sessionId: "session-1",
    }, async (_url, init) => {
      secondAuthorization = JSON.parse(String(init.body)).execution_authorization_id;
      return new Response(JSON.stringify({
        command_id: "cmd-2",
        state: "QUEUED",
        phase: "EXECUTE",
        authorization_source: "clara-os",
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    assert.notEqual(secondAuthorization, firstAuthorization);

    await assert.rejects(
      authorizeClaraLiveExecution({
        agentId: "agent-1",
        connector: "chamsys_mq50",
        capability: "playback_level",
        parameters: {},
        sessionId: "session-1",
      }, async () => new Response(JSON.stringify({
        command_id: "cmd-3",
        state: "QUEUED",
        phase: "EXECUTE",
        authorization_source: "clara-live",
      }), { status: 200, headers: { "content-type": "application/json" } })),
      /invalid execution receipt/,
    );

    console.log("Clara Live execution authority contract: OK");
  } finally {
    if (previousBase === undefined) delete process.env.CLARA_LIVE_BASE_URL;
    else process.env.CLARA_LIVE_BASE_URL = previousBase;
    if (previousToken === undefined) delete process.env.CLARA_OS_PRODUCT_TOKEN;
    else process.env.CLARA_OS_PRODUCT_TOKEN = previousToken;
  }
}

void main();
