import assert from "node:assert/strict";
import {readFileSync} from 'node:fs';
import test from "node:test";
import { BrevoClient } from "@/lib/connectors/brevo/client";
import {readBrevoBounded,brevoReadKindFromMessage,brevoReadFailureCode} from '@/lib/connectors/brevo/api-key-read';
import {brevoM2MStatus,brevoM2MReadScope,requestBrevoM2MReadToken,BrevoM2MError} from '@/lib/connectors/brevo/m2m';
import { BREVO_CAPABILITIES, BrevoConnectorDefinition } from "@/lib/connectors/brevo/definition";
import { BrevoApiError } from "@/lib/connectors/brevo/error";
import { parseBrevoWebhook } from "@/lib/connectors/brevo/webhook";

type Call = { url: string; init?: RequestInit };
function fakeHttp(responses: Response[]) {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      const response = responses.shift();
      if (!response) throw new Error("Unexpected HTTP call");
      return response;
    },
  };
}
function json(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("Brevo definition declares the V2 native commercial capability surface and operation types", () => {
  assert.equal(BrevoConnectorDefinition.id, "brevo");
  assert.equal(BrevoConnectorDefinition.name, "Brevo");
  assert.deepEqual(
    BrevoConnectorDefinition.capabilities.map(({ id }) => id),
    Object.values(BREVO_CAPABILITIES),
  );
  assert.equal(
    BrevoConnectorDefinition.capabilities.find(({ id }) => id === "brevo.email.send")?.operationType,
    "EXECUTE",
  );
  const emailPreparation = BrevoConnectorDefinition.capabilities.find(
    ({ id }) => id === "brevo.email.prepare",
  );
  assert.equal(emailPreparation?.operationType, "PREPARE");
  assert.notEqual(emailPreparation?.operationType, "WRITE");
  assert.notEqual(emailPreparation?.operationType, "EXECUTE");
  assert.deepEqual(BrevoConnectorDefinition.authentication, {
    type: "oauth2",
    credentialReference: "connectionId",
  });
});

test("client constructs an authenticated contact lookup without reading environment", async () => {
  const http = fakeHttp([json({ id: 17, email: "ada@example.com" })]);
  const client = new BrevoClient({ accessToken: "oauth-access", fetch: http.fetch, baseUrl: "https://brevo.test/v3/" });
  const result = await client.searchContacts({ identifier: "ada@example.com" });
  assert.equal(result.contacts[0]?.id, 17);
  assert.equal(http.calls[0]?.url, "https://brevo.test/v3/contacts/ada%40example.com");
  assert.equal(new Headers(http.calls[0]?.init?.headers).get("authorization"), "Bearer oauth-access");
});

test("contact upsert updates an existing contact and returns its provider id", async () => {
  const http = fakeHttp([
    json({ id: 42, email: "ada@example.com" }),
    new Response(null, { status: 204 }),
  ]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  assert.deepEqual(await client.upsertContact({ email: "ada@example.com", attributes: { FIRSTNAME: "Ada" } }), {
    contactId: 42,
    email: "ada@example.com",
    created: false,
  });
  assert.equal(http.calls[1]?.init?.method, "PUT");
  assert.deepEqual(JSON.parse(String(http.calls[1]?.init?.body)), { attributes: { FIRSTNAME: "Ada" } });
});

test("contact upsert creates a missing contact", async () => {
  const http = fakeHttp([json({ message: "missing" }, 404), json({ id: 43 }, 201)]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  const result = await client.upsertContact({ email: "new@example.com", listIds: [8] });
  assert.deepEqual(result, { contactId: 43, email: "new@example.com", created: true });
  assert.equal(http.calls[1]?.url, "https://api.brevo.com/v3/contacts");
  assert.equal(http.calls[1]?.init?.method, "POST");
});

test("template lookup supports a provider template id", async () => {
  const http = fakeHttp([json({ id: 9, name: "Welcome", subject: "Hello" })]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  assert.equal((await client.searchTemplates({ templateId: 9 })).templates[0]?.name, "Welcome");
  assert.match(http.calls[0]?.url ?? "", /\/smtp\/templates\/9$/);
});

test("transactional template email preserves params and parses messageId", async () => {
  const http = fakeHttp([json({ messageId: "<provider-message-1>" }, 201)]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  const result = await client.sendTransactionalEmail({
    to: [{ email: "grace@example.com", name: "Grace" }],
    templateId: 12,
    params: { firstName: "Grace", invoice: 73 },
  });
  assert.equal(result.messageId, "<provider-message-1>");
  assert.deepEqual(JSON.parse(String(http.calls[0]?.init?.body)), {
    to: [{ email: "grace@example.com", name: "Grace" }],
    templateId: 12,
    params: { firstName: "Grace", invoice: 73 },
  });
});

test("campaign read, preparation, and update use focused campaign operations", async () => {
  const http = fakeHttp([
    json({ id: 5, name: "Launch", status: "draft" }),
    json({ id: 6 }, 201),
    new Response(null, { status: 204 }),
  ]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  assert.equal((await client.getCampaign(5)).id, 5);
  const preparation = {
    name: "Launch", subject: "News", sender: { email: "team@example.com" },
    recipients: { listIds: [2] }, templateId: 7,
  };
  assert.deepEqual(await client.createCampaign(preparation), { id: 6 });
  assert.deepEqual(await client.updateCampaign(6, { subject: "Updated" }), { campaignId: 6, updated: true });
  assert.deepEqual(http.calls.map(({ init }) => init?.method), [undefined, "POST", "PUT"]);
});

test("401, 403, and rate limits are normalized without leaking credentials", async () => {
  for (const [status, expected] of [[401, "UNAUTHORIZED"], [403, "FORBIDDEN"], [429, "RATE_LIMITED"]] as const) {
    const http = fakeHttp([json({ message: "denied never-return-this", access_token: "secret", nested: { apiKey: "also-secret" } }, status, { "retry-after": "30" })]);
    const client = new BrevoClient({ accessToken: "never-return-this", fetch: http.fetch });
    await assert.rejects(
      () => client.getContact("a@example.com"),
      (error) => {
        assert.ok(error instanceof BrevoApiError);
        assert.equal(error.code, expected);
        if (status === 429) assert.equal(error.retryAfterSeconds, 30);
        const serialized = JSON.stringify(error);
        assert.doesNotMatch(serialized, /never-return-this|also-secret|"secret"/);
        assert.match(serialized, /REDACTED/);
        return true;
      },
    );
  }
});

test("webhook parser maps supported delivery events to credential-free domain events", () => {
  assert.deepEqual(parseBrevoWebhook({
    event: "delivered", ts_event: 1_700_000_000, email: "user@example.com",
    "message-id": "message-3", camp_id: 44, apiKey: "ignored",
  }), {
    provider: "brevo", event: "delivered", occurredAt: new Date(1_700_000_000_000),
    email: "user@example.com", messageId: "message-3", campaignId: 44, link: undefined,
  });
  assert.equal(parseBrevoWebhook({ event: "unknown", ts: 1 }), null);
});


test("lists can be read, created, and populated natively", async () => {
  const http = fakeHttp([
    json({ count: 1, lists: [{ id: 3, name: "Prospects", folderId: 1 }] }),
    json({ id: 4 }, 201),
    json({ success: ["ada@example.com"], failure: [] }, 201),
  ]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  assert.equal((await client.readLists({ limit: 10 })).lists[0]?.name, "Prospects");
  assert.deepEqual(await client.createList({ name: "Clients", folderId: 1 }), { id: 4 });
  assert.deepEqual(await client.manageListMembership({ listId: 4, action: "add", emails: ["ada@example.com"] }), {
    listId: 4, action: "add", success: true,
  });
  assert.match(http.calls[0]?.url ?? "", /\/contacts\/lists\?limit=10/);
  assert.equal(http.calls[1]?.init?.method, "POST");
  assert.match(http.calls[2]?.url ?? "", /\/contacts\/lists\/4\/contacts\/add$/);
});

test("templates can be filtered and created natively", async () => {
  const http = fakeHttp([
    json({ count: 1, templates: [{ id: 9, name: "Welcome", isActive: true }] }),
    json({ id: 10 }, 201),
  ]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  assert.equal((await client.searchTemplates({ templateStatus: true })).templates[0]?.id, 9);
  assert.deepEqual(await client.createTemplate({
    templateName: "Invoice", subject: "Your invoice",
    sender: { email: "team@example.com" }, htmlContent: "<p>Your invoice is ready.</p>",
    isActive: true,
  }), { id: 10 });
  assert.match(http.calls[0]?.url ?? "", /templateStatus=true/);
  assert.equal(http.calls[1]?.init?.method, "POST");
});

test("campaign execution is explicit and uses sendNow", async () => {
  const http = fakeHttp([new Response(null, { status: 204 })]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  assert.deepEqual(await client.sendCampaign(27), { campaignId: 27, accepted: true });
  assert.equal(http.calls[0]?.url, "https://api.brevo.com/v3/emailCampaigns/27/sendNow");
  assert.equal(http.calls[0]?.init?.method, "POST");
  assert.equal(
    BrevoConnectorDefinition.capabilities.find(({ id }) => id === BREVO_CAPABILITIES.CAMPAIGN_SEND)?.operationType,
    "EXECUTE",
  );
});

test("statistics support aggregate and campaign report modes", async () => {
  const http = fakeHttp([
    json({ delivered: 10, opens: 8, clicks: 3 }),
    json({ id: 27, statistics: { globalStats: { delivered: 10 } } }),
  ]);
  const client = new BrevoClient({ accessToken: "token", fetch: http.fetch });
  const aggregate = await client.readStatistics({ mode: "aggregate", startDate: "2026-09-01", endDate: "2026-09-18" });
  assert.equal(aggregate.delivered, 10);
  const campaign = await client.readStatistics({ mode: "campaign", campaignId: 27 });
  assert.equal(campaign.id, 27);
  assert.match(http.calls[0]?.url ?? "", /\/smtp\/statistics\/aggregatedReport/);
  assert.match(http.calls[1]?.url ?? "", /\/emailCampaigns\/27\?statistics=/);
});

test('API key mode uses only GET and api-key header; never an OAuth bearer token',async()=>{
 const http=fakeHttp([json({contacts:[{id:14,email:'client@example.com',listIds:[3]}],count:1})]);
 const data=await readBrevoBounded('contacts','restricted-key',http.fetch);
 assert.deepEqual(data,{kind:'contacts',count:1,items:[{id:14,email:'client@example.com',listIds:[3]}],partial:false});
 const headers=new Headers(http.calls[0]?.init?.headers);
 assert.equal(headers.get('api-key'),'restricted-key');
 assert.equal(headers.get('authorization'),null);
 assert.equal(http.calls[0]?.init?.method,'GET');
 assert.equal(http.calls.length,1);
});
test('API key mode refuses mutation before provider transport',async()=>{
 const http=fakeHttp([]);
 const client=new BrevoClient({apiKey:'restricted-key',fetch:http.fetch});
 await assert.rejects(()=>client.sendTransactionalEmail({to:[{email:'x@example.com'}],textContent:'test'}),/BREVO_API_KEY_READ_ONLY/);
 await assert.rejects(()=>client.createList({name:'blocked',folderId:1}),/BREVO_API_KEY_READ_ONLY/);
 assert.equal(http.calls.length,0);
});
test('Brevo Brain read intent is explicit and bounded, never an ambient contact search',async()=>{
 assert.equal(brevoReadKindFromMessage('Montre mes contacts Brevo'),'contacts');
 assert.equal(brevoReadKindFromMessage('Liste Brevo'),'lists');
 assert.equal(brevoReadKindFromMessage('Modèles Brevo'),'templates');
 assert.equal(brevoReadKindFromMessage('Campagnes Brevo'),'campaigns');
 assert.equal(brevoReadKindFromMessage('contacts du projet'),null);
 assert.equal(brevoReadKindFromMessage('Brevo'),null);
 const http=fakeHttp([]);
 await assert.rejects(()=>readBrevoBounded('contacts','',http.fetch),/BREVO_API_KEY_NOT_CONFIGURED/);
 assert.equal(http.calls.length,0);
});
test('API key cannot leak through normalized provider failure',async()=>{
 const http=fakeHttp([json({message:'restricted-key',apiKey:'restricted-key'},403)]);
 await assert.rejects(()=>readBrevoBounded('lists','restricted-key',http.fetch),e=>{
  assert.equal(e?.code,'FORBIDDEN');
  assert.doesNotMatch(JSON.stringify(e),/restricted-key/);
  return true;
 });
});

test('Brevo list-of-contacts wording routes to list GET, not contact export',async()=>{
 for(const message of ['Clara, consulte mes listes de contacts Brevo et présente-moi celles qui sont disponibles','Show my lists of Brevo contacts','Muestra mis listas de contactos Brevo','Zeige Brevo Listen mit Kontakten','Mostrami le liste contatti Brevo']){
  assert.equal(brevoReadKindFromMessage(message),'lists',message);
 }
 const http=fakeHttp([json({count:1,lists:[{id:27,name:'Newsletter',uniqueSubscribers:11}]})]);
 const data=await readBrevoBounded(brevoReadKindFromMessage('listes de contacts Brevo')!,'restricted-key',http.fetch);
 assert.deepEqual(data,{kind:'lists',count:1,items:[{id:27,name:'Newsletter',uniqueSubscribers:11}],partial:false});
 assert.equal(http.calls.length,1);
 assert.match(http.calls[0].url,/\/contacts\/lists\?limit=10&offset=0$/);
 assert.equal(http.calls[0].init?.method,'GET');
});
test('Brevo failures distinguish status codes without leaking provider messages',()=>{
 const codes=[[401,'UNAUTHORIZED','BREVO_READ_UNAUTHORIZED'],[403,'FORBIDDEN','BREVO_READ_FORBIDDEN'],[429,'RATE_LIMITED','BREVO_READ_RATE_LIMITED'],[500,'API_ERROR','BREVO_READ_PROVIDER_ERROR']] as const;
 for(const [status,code,result] of codes){
  const e=new BrevoApiError(status,code,'PRIVATE-DO-NOT-SHOW',{apiKey:'PRIVATE-DO-NOT-SHOW'});
  assert.equal(brevoReadFailureCode(e),result);
  assert.doesNotMatch(brevoReadFailureCode(e),/PRIVATE|apiKey/);
 }
 assert.equal(brevoReadFailureCode(new Error('PRIVATE_PROVIDER_IP_AND_KEY')),'BREVO_READ_TRANSPORT_ERROR');
});



test('Brevo M2M mints only one explicitly requested READ scope and calls GET with Bearer',async()=>{
 const tokenHttp=fakeHttp([json({access_token:'scoped-access-token-12345',token_type:'Bearer',expires_in:3600,scope:'contacts:read'})]);
 const env={BREVO_M2M_CLIENT_ID:'service-client',BREVO_M2M_CLIENT_SECRET:'private-keep-out'};
 assert.deepEqual(brevoM2MStatus(env),{selected:true,configured:true});
 assert.equal(brevoM2MReadScope('lists'),'contacts:read');
 assert.equal(brevoM2MReadScope('campaigns'),'campaigns.email:read');
 assert.equal(brevoM2MReadScope('templates'),'transactional.email:read');
 const token=await requestBrevoM2MReadToken('lists',env,tokenHttp.fetch);
 assert.equal(token,'scoped-access-token-12345');
 assert.equal(tokenHttp.calls.length,1);
 assert.equal(tokenHttp.calls[0]?.url,'https://api.brevo.com/realms/partner/oauth/token');
 assert.equal(tokenHttp.calls[0]?.init?.method,'POST');
 const form=new URLSearchParams(String(tokenHttp.calls[0]?.init?.body));
 assert.equal(form.get('grant_type'),'client_credentials');
 assert.equal(form.get('client_id'),'service-client');
 assert.equal(form.get('client_secret'),'private-keep-out');
 assert.equal(form.get('scope'),'contacts:read');
 assert.equal(tokenHttp.calls[0]?.init?.redirect,'error');
 const apiHttp=fakeHttp([json({count:1,lists:[{id:7,name:'Commercial'}]})]);
 const lists=await readBrevoBounded('lists',{accessToken:token},apiHttp.fetch);
 assert.deepEqual(lists,{kind:'lists',count:1,items:[{id:7,name:'Commercial',uniqueSubscribers:undefined}],partial:false});
 assert.equal(new Headers(apiHttp.calls[0]?.init?.headers).get('Authorization'),'Bearer scoped-access-token-12345');
 assert.equal(new Headers(apiHttp.calls[0]?.init?.headers).get('api-key'),null);
 assert.equal(apiHttp.calls[0]?.init?.method,undefined);
});
test('M2M incomplete configuration, invalid token, wrong scope and unauthorized exchange fail closed and hide secrets',async()=>{
 const env={BREVO_M2M_CLIENT_ID:'client',BREVO_M2M_CLIENT_SECRET:'very-sensitive'};
 assert.deepEqual(brevoM2MStatus({BREVO_M2M_CLIENT_ID:'client'}),{selected:true,configured:false});
 let called=false;
 await assert.rejects(()=>requestBrevoM2MReadToken('contacts',{BREVO_M2M_CLIENT_ID:'client'},async()=>{
  called=true;throw Error('not expected');
 }),{code:'BREVO_M2M_CONFIGURATION_INCOMPLETE'});
 assert.equal(called,false);
 for(const bad of [
  {access_token:'scoped-token-some-123',token_type:'Bearer',expires_in:3600,scope:'contacts:read campaigns.email:write'},
  {access_token:'scoped-token-some-123',token_type:'Bearer',expires_in:3600,scope:'campaigns.email:write'},
  {access_token:'scoped-token-some-123',token_type:'Bearer',expires_in:0,scope:'contacts:read'},
 ]){
  const http=fakeHttp([json(bad)]);
  await assert.rejects(()=>requestBrevoM2MReadToken('contacts',env,http.fetch),(err:unknown)=>{
   assert.ok(err instanceof BrevoM2MError);
   assert.equal(err.code,'BREVO_M2M_TOKEN_INVALID');
   assert.doesNotMatch(JSON.stringify(err),/very-sensitive|scoped-token-some-123/);
   return true;
  });
 }
 const rejected=fakeHttp([json({error:'invalid_client',client_secret:'very-sensitive'},401)]);
 await assert.rejects(()=>requestBrevoM2MReadToken('contacts',env,rejected.fetch),(err:unknown)=>{
  assert.ok(err instanceof BrevoM2MError);
  assert.equal(err.code,'BREVO_M2M_TOKEN_UNAUTHORIZED');
  assert.doesNotMatch(JSON.stringify(err),/very-sensitive|invalid_client/);
  return true;
 });
 assert.equal(brevoReadFailureCode(new BrevoM2MError('BREVO_M2M_TOKEN_UNAUTHORIZED')),'BREVO_M2M_TOKEN_UNAUTHORIZED');
});
test('native Brevo M2M is the preferred fail-closed READ path without enabling sends or bypassing scoped session',()=>{
 const brain=readFileSync('src/lib/brain/brain-source-registry.ts','utf8');
 assert.match(brain,/brevoM2MStatus\(\)\.selected/);
 assert.match(brain,/requestBrevoM2MReadToken\(kind\)/);
 assert.match(brain,/native.scope.workspaceId!==CURRENT_WORKSPACE_ID/);
 assert.doesNotMatch(brain,/sendCampaign\(|sendTransactionalEmail\(/);
 const status=readFileSync('src/app/api/native/brevo/status/route.ts','utf8');
 assert.match(status,/m2mConfigured:m2m.configured/);
 assert.match(status,/connected:false/);
});
