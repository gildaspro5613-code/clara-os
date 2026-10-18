import assert from "node:assert/strict";
import test from "node:test";
import { authorizeCapability } from "../lib/capabilities/capability-policy";
import { authorizePhysicalExecution } from "../lib/connectors/clara-live/execution-authority";
import { assertRecetteExternalExecutionBlocked } from "../lib/recette/external-execution-guard";
import { BrevoClient } from "../lib/connectors/brevo/client";

const originalMode = process.env.CLARA_OS_RUNTIME_MODE;
const originalUrl = process.env.CLARA_LIVE_BASE_URL;
const originalToken = process.env.CLARA_OS_PRODUCT_TOKEN;

test("Recette blocks write/execute capabilities even with premium approval", () => {
  process.env.CLARA_OS_RUNTIME_MODE = "recette";
  try {
    for (const capabilityId of ["brevo.email.send", "make.scenario.execute", "commercial-email.send", "send-gmail"]) {
      const decision = authorizeCapability(capabilityId, {actorId:"fictional", workspaceId:"fictional", plan:"premium", approvedCapabilityIds:[capabilityId]});
      assert.equal(decision.allowed, false);
      if (!decision.allowed) assert.equal(decision.code, "RECETTE_EXTERNAL_EXECUTION_DENIED");
    }
    assert.equal(authorizeCapability("read-calendar", {actorId:"fictional",workspaceId:"fictional",plan:"essential"}).allowed,true);
  } finally {
    if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = originalMode;
  }
});

test("Recette denies physical execution before credentials and transport", async () => {
  process.env.CLARA_OS_RUNTIME_MODE = "recette";
  process.env.CLARA_LIVE_BASE_URL = "https://example.invalid";
  process.env.CLARA_OS_PRODUCT_TOKEN = "fictional-token";
  let calls = 0;
  try {
    await assert.rejects(() => authorizePhysicalExecution({agentId:"fictional",connector:"fake",capability:"execute",parameters:{},sessionId:"fictional"},async () => {
      calls++;
      throw new Error("NETWORK_CALLED");
    }), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
    assert.equal(calls,0);
    assert.throws(() => assertRecetteExternalExecutionBlocked("smtp.send"), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
  } finally {
    if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = originalMode;
    if (originalUrl === undefined) delete process.env.CLARA_LIVE_BASE_URL;
    else process.env.CLARA_LIVE_BASE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.CLARA_OS_PRODUCT_TOKEN;
    else process.env.CLARA_OS_PRODUCT_TOKEN = originalToken;
  }
});

test("Recette denies direct Brevo client transport", async () => {
  process.env.CLARA_OS_RUNTIME_MODE = "recette";
  let calls = 0;
  try {
    const client = new BrevoClient({accessToken:"fictional",fetch:async()=>{calls++;throw new Error("NETWORK_CALLED");}});
    await assert.rejects(() => client.searchContacts({identifier:"fictional@example.invalid"}), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
    assert.equal(calls,0);
  } finally {
    if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = originalMode;
  }
});
test("Recette denies Google OAuth client before repository and provider access", async () => {  process.env.CLARA_OS_RUNTIME_MODE = "recette";  try {    const { GoogleAuth } = await import("../lib/connectors/internal/google/auth/google-auth");    await assert.rejects(() => new GoogleAuth().createClient("fictional"), /RECETTE_EXTERNAL_EXECUTION_DENIED/);  } finally {    if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;    else process.env.CLARA_OS_RUNTIME_MODE = originalMode;  }});