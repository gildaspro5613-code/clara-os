import assert from "node:assert/strict";
import test from "node:test";
import { BrevoClient } from "@/lib/connectors/brevo/client";
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
