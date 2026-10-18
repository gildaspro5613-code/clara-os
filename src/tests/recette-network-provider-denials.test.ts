import assert from "node:assert/strict";
import test from "node:test";
import { MicrosoftGraphClient } from "../lib/connectors/microsoft/graph/microsoft-graph-client";
import { executeExternalProductCapability } from "../lib/external-capabilities/product-callback";
import { assertRecetteExternalExecutionBlocked } from "../lib/recette/external-execution-guard";

const fixture = { capability: "fictional", userId: "fictional-user", workspaceId: "fictional-workspace", sessionId: "fictional-session", context: {} };
const product = { productId: "fictional-product", callbackBaseUrl: "https://example.invalid", token: "fictional-token" };

test("Microsoft Graph denies Recette before invoking fetch", async () => {
  const previous = process.env.CLARA_OS_RUNTIME_MODE;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    process.env.CLARA_OS_RUNTIME_MODE = "recette";
    globalThis.fetch = (async () => { calls++; throw Error("NETWORK_CALLED"); }) as typeof fetch;
    await assert.rejects(() => new MicrosoftGraphClient("fictional-token").getCurrentUser(), /RECETTE_EXTERNAL_EXECUTION_DENIED:microsoft.graph/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = previous;
  }
});

test("External product callback denies Recette before invoking fetch", async () => {
  const previous = process.env.CLARA_OS_RUNTIME_MODE;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    process.env.CLARA_OS_RUNTIME_MODE = "recette";
    globalThis.fetch = (async () => { calls++; throw Error("NETWORK_CALLED"); }) as typeof fetch;
    await assert.rejects(() => executeExternalProductCapability(product as never, fixture), /RECETTE_EXTERNAL_EXECUTION_DENIED:external-product.callback/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = previous;
  }
});

test("Provider denials also activate from isolated Vercel project identity", () => {
  const priorMode = process.env.CLARA_OS_RUNTIME_MODE;
  const priorProject = process.env.VERCEL_PROJECT_ID;
  try {
    delete process.env.CLARA_OS_RUNTIME_MODE;
    process.env.VERCEL_PROJECT_ID = "prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz";
    assert.throws(() => assertRecetteExternalExecutionBlocked("microsoft.oauth"), /RECETTE_EXTERNAL_EXECUTION_DENIED:microsoft.oauth/);
    assert.throws(() => assertRecetteExternalExecutionBlocked("auth.provider-sign-in"), /RECETTE_EXTERNAL_EXECUTION_DENIED:auth.provider-sign-in/);
  } finally {
    if (priorMode === undefined) delete process.env.CLARA_OS_RUNTIME_MODE;
    else process.env.CLARA_OS_RUNTIME_MODE = priorMode;
    if (priorProject === undefined) delete process.env.VERCEL_PROJECT_ID;
    else process.env.VERCEL_PROJECT_ID = priorProject;
  }
});
