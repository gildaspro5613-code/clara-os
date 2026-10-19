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

test('five corrected boundaries deny before HTTP/SDK in every Recette detection mode; non-Recette contracts remain usable', async t => {
  const {completeGoogleSignIn}=await import('../lib/auth/google-sign-in');
  const {completeMicrosoftSignIn}=await import('../lib/auth/microsoft-sign-in');
  const {createBrevoOAuthProvider}=await import('../lib/connectors/brevo/oauth');
  const {createLiveCanonicalBridge,createLiveCanonicalTransport}=await import('../lib/canonical/live-bridge');
  const {moduleFrom}=await import('./helpers/production-p0-harness');
  const guard=await import('../lib/recette/external-execution-guard');
  const settings={GOOGLE_CLIENT_ID:'synthetic',GOOGLE_CLIENT_SECRET:'synthetic',CLARA_AUTH_GOOGLE_REDIRECT_URI:'https://recette.example.test/callback',
    CLARA_AUTH_MICROSOFT_TENANT_ID:'synthetic',CLARA_AUTH_MICROSOFT_CLIENT_ID:'synthetic',CLARA_AUTH_MICROSOFT_CLIENT_SECRET:'synthetic',CLARA_AUTH_MICROSOFT_REDIRECT_URI:'https://recette.example.test/callback',
    CLARA_LIVE_PRODUCT_TOKEN:'synthetic',CLARA_LIVE_WORKSPACE_ID:'synthetic',CLARA_LIVE_CAPABILITIES:'["canonical-links:v1"]',CLARA_LIVE_CALLBACK_BASE_URL:'https://synthetic.example.com'};
  const markers=['CLARA_OS_RUNTIME_MODE','VERCEL_PROJECT_ID','CLARA_RECETTE_MODE'];
  const keys=[...Object.keys(settings),...markers];
  const saved=new Map(keys.map(k=>[k,process.env[k]]));const initialFetch=globalThis.fetch;
  t.after(()=>{globalThis.fetch=initialFetch;for(const [k,v] of saved){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
  Object.assign(process.env,settings);
  let httpCalls=0,constructors=0,sdkCalls=0;
  const stopped:typeof fetch=async()=>{httpCalls++;throw Error('SIMULATED_TRANSPORT');};
  globalThis.fetch=stopped;
  class Client {
    constructor(){constructors++;}
    async getToken(input:{code:string}){sdkCalls++;assert.equal(input.code,'synthetic-code');return {tokens:{access_token:'synthetic-access',refresh_token:'synthetic-refresh',expiry_date:10000}};}
    setCredentials(){}
    async refreshAccessToken(){sdkCalls++;return {credentials:{access_token:'synthetic-access',refresh_token:'synthetic-refresh',expiry_date:10000}};}
  }
  // Only the SDK is substituted. The security function is the actual module.
  const {googleOAuthProvider}=moduleFrom('src/lib/connectors/google/oauth/google-oauth.ts',{
    '@/lib/recette/external-execution-guard':guard,
    '@/lib/native/scoped-context':{nativeContext:()=>null},
    '@/lib/config/google':{googleConfig:{clientId:'synthetic',clientSecret:'synthetic',redirectUri:'https://recette.example.test/callback'}},
    googleapis:{google:{auth:{OAuth2:Client}}},
  }) as {googleOAuthProvider:{exchangeCode(input:{code:string;redirectUri:string}):Promise<{accessToken:string}>;refresh(input:{refreshToken:string}):Promise<{accessToken:string}>}};
  for(const marker of [{CLARA_OS_RUNTIME_MODE:'recette'},{VERCEL_PROJECT_ID:'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz'},{CLARA_RECETTE_MODE:'isolated-v1'}]){
    await t.test(`zero HTTP/SDK calls for ${Object.keys(marker)[0]}`,async()=>{
      for(const k of markers)delete process.env[k];Object.assign(process.env,marker);
      const before=[httpCalls,constructors,sdkCalls];
      await assert.rejects(completeGoogleSignIn('synthetic-code','synthetic','synthetic'),/RECETTE_EXTERNAL_EXECUTION_DENIED:auth.provider-sign-in/);
      await assert.rejects(completeMicrosoftSignIn('synthetic-code','synthetic','synthetic'),/RECETTE_EXTERNAL_EXECUTION_DENIED:auth.provider-sign-in/);
      const brevo=createBrevoOAuthProvider({clientId:'synthetic',clientSecret:'synthetic'},stopped);
      await assert.rejects(brevo.exchangeCode({code:'synthetic-code',redirectUri:'https://recette.example.test/callback'}),/RECETTE_EXTERNAL_EXECUTION_DENIED:brevo.oauth/);
      await assert.rejects(brevo.refresh!({refreshToken:'synthetic'}),/RECETTE_EXTERNAL_EXECUTION_DENIED:brevo.oauth/);
      // refresh has no catch/log branch: prove refusal before constructor/refresh.
      await assert.rejects(googleOAuthProvider.refresh({refreshToken:'synthetic'}),/RECETTE_EXTERNAL_EXECUTION_DENIED:google.workspace-oauth/);
      const logger=t.mock.method(console,'error',()=>{});
      try{await assert.rejects(googleOAuthProvider.exchangeCode({code:'synthetic-code',redirectUri:'https://recette.example.test/callback'}),/RECETTE_EXTERNAL_EXECUTION_DENIED:google.workspace-oauth/);}finally{logger.mock.restore();}
      await assert.rejects(createLiveCanonicalTransport(stopped)('/api/core/canonical/link-proofs/verify',{}),/RECETTE_EXTERNAL_EXECUTION_DENIED:canonical.live/);
      assert.deepEqual([httpCalls,constructors,sdkCalls],before);
    });
  }
  await t.test('outside Recette sign-in reaches only its simulated exchange; OAuth and Live payloads are unchanged',async()=>{
    for(const k of markers)delete process.env[k];
    const before=httpCalls;
    await assert.rejects(completeGoogleSignIn('synthetic-code','synthetic','synthetic'),/SIMULATED_TRANSPORT/);
    await assert.rejects(completeMicrosoftSignIn('synthetic-code','synthetic','synthetic'),/SIMULATED_TRANSPORT/);
    assert.equal(httpCalls,before+2);
    const brevo=createBrevoOAuthProvider({clientId:'synthetic',clientSecret:'synthetic'},async(_url,init)=>{
      assert.equal(init?.method,'POST');assert.equal((init?.body as URLSearchParams).get('client_id'),'synthetic');
      return Response.json({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:60});
    });
    assert.equal((await brevo.exchangeCode({code:'synthetic-code',redirectUri:'https://recette.example.test/callback'})).accessToken,'synthetic-access');
    assert.equal((await brevo.refresh!({refreshToken:'synthetic'})).refreshToken,'synthetic-refresh');
    assert.equal((await googleOAuthProvider.exchangeCode({code:'synthetic-code',redirectUri:'https://recette.example.test/callback'})).accessToken,'synthetic-access');
    assert.equal((await googleOAuthProvider.refresh({refreshToken:'synthetic'})).accessToken,'synthetic-access');
    const candidate={proofId:'proof',tokenHash:'synthetic-hash'};
    const bridge=createLiveCanonicalBridge(async(url,init)=>{
      assert.equal(String(url),'https://synthetic.example.com/api/core/canonical/link-proofs/verify');
      assert.deepEqual(JSON.parse(String(init?.body)),{proofId:candidate.proofId,challengeHash:candidate.tokenHash});
      assert.equal(init?.redirect,'error');assert.equal(new Headers(init?.headers).get('x-clara-product'),'clara-live');
      return Response.json({proof:{id:'synthetic-proof'}});
    });
    assert.deepEqual(await bridge(candidate as never),{id:'synthetic-proof'});
  });
});
