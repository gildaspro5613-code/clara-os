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
test("Recette denies native Google work before DB claim or HTTP", async () => {
  process.env.CLARA_OS_RUNTIME_MODE = "recette";
  try {
    const { executeGoogleWork } = await import("../lib/native/google-work");
    await assert.rejects(() => executeGoogleWork(new Request("https://recette.invalid"), "fictional", "fictional", "fictional", true), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
  } finally {
    if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = originalMode;
  }
});

test("Recette denies ElevenLabs API before API key access and network", async () => {
  process.env.CLARA_OS_RUNTIME_MODE = "recette";
  try {
    const { ElevenLabsEngine } = await import("../lib/connectors/internal/elevenlabs/elevenlabs-engine");
    const result = await new ElevenLabsEngine().getModels();
    assert.equal(result.success, false);
    assert.match(result.error ?? "", /RECETTE_EXTERNAL_EXECUTION_DENIED/);
  } finally {
    if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = originalMode;
  }
});

test("Recette denies Make webhook without invoking injected fetch", async () => {
  process.env.CLARA_OS_RUNTIME_MODE = "recette";
  try {
    const { MakeWebhookClient } = await import("../lib/connectors/make/client");
    let called = false;
    const client = new MakeWebhookClient(async () => { called = true; throw Error("NETWORK_CALLED"); });
    await assert.rejects(() => client.execute({url:"https://hook.make.com/fictional"}, {scenarioKey:"fictional"} as never), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
    assert.equal(called, false);
  } finally { if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE; else process.env.CLARA_OS_RUNTIME_MODE = originalMode; }
});
test("Recette denies telephony outbound call without provider credentials", async () => {
  process.env.CLARA_OS_RUNTIME_MODE = "recette";
  try {
    const { TelephonyEngine } = await import("../lib/connectors/internal/telephony/telephony-engine");
    const result = await new TelephonyEngine().outboundCall({operation:"outbound-call",toNumber:"+33123456789"});
    assert.equal(result.success, false);
    assert.match(result.error ?? "", /RECETTE_EXTERNAL_EXECUTION_DENIED/);
  } finally { if (originalMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE; else process.env.CLARA_OS_RUNTIME_MODE = originalMode; }
});

test("Recette project identity denies external execution even with missing or incorrect runtime mode", () => {
  const priorMode = process.env.CLARA_OS_RUNTIME_MODE;
  const priorProject = process.env.VERCEL_PROJECT_ID;
  try {
    process.env.VERCEL_PROJECT_ID = "prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz";
    for (const mode of [undefined, "production", "typo"]) {
      if (mode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
      else process.env.CLARA_OS_RUNTIME_MODE = mode;
      assert.throws(() => assertRecetteExternalExecutionBlocked("make.webhook"), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
      const decision = authorizeCapability("make.scenario.execute", {actorId:"fictional", workspaceId:"fictional", plan:"premium", approvedCapabilityIds:["make.scenario.execute"]});
      assert.equal(decision.allowed, false);
    }
    process.env.VERCEL_PROJECT_ID = "prj_unrelated";
    delete process.env.CLARA_OS_RUNTIME_MODE;
    assert.doesNotThrow(() => assertRecetteExternalExecutionBlocked("make.webhook"));
  } finally {
    if (priorMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = priorMode;
    if (priorProject === undefined) delete process.env.VERCEL_PROJECT_ID;
    else process.env.VERCEL_PROJECT_ID = priorProject;
  }
});

test("Recette dedicated deployment marker denies external execution without runtime mode or project id", () => {
  const mode = process.env.CLARA_OS_RUNTIME_MODE;
  const project = process.env.VERCEL_PROJECT_ID;
  const marker = process.env.CLARA_RECETTE_MODE;
  try {
    delete process.env.CLARA_OS_RUNTIME_MODE;
    delete process.env.VERCEL_PROJECT_ID;
    process.env.CLARA_RECETTE_MODE = "enabled";
    assert.throws(() => assertRecetteExternalExecutionBlocked("ionos.smtp"), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
    process.env.CLARA_RECETTE_MODE = "incorrect";
    assert.throws(() => assertRecetteExternalExecutionBlocked("make.webhook"), /RECETTE_EXTERNAL_EXECUTION_DENIED/);
  } finally {
    if (mode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE; else process.env.CLARA_OS_RUNTIME_MODE = mode;
    if (project === undefined) delete process.env.VERCEL_PROJECT_ID; else process.env.VERCEL_PROJECT_ID = project;
    if (marker === undefined) delete process.env.CLARA_RECETTE_MODE; else process.env.CLARA_RECETTE_MODE = marker;
  }
});
