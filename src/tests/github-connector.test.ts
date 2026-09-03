import assert from "node:assert/strict";
import test from "node:test";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionResolver, ConnectionResolutionError } from "@/lib/connections/connection-resolver";
import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import type { CredentialStore } from "@/lib/connections/credential-store";
import { GitHubConnectorAdapter } from "@/lib/connectors/github/adapter";
import { GitHubClient } from "@/lib/connectors/github/client";
import { GITHUB_CAPABILITIES, GitHubConnectorDefinition } from "@/lib/connectors/github/definition";
import { GitHubApiError } from "@/lib/connectors/github/errors";

type Call = { url: string; init?: RequestInit };
function http(responses: Response[]) {
  const calls: Call[] = [];
  return { calls, fetch: async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected HTTP call");
    return response;
  } };
}
function json(body: unknown, status = 200, headers: HeadersInit = {}) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } }); }

class MemoryConnections implements ConnectionRepository {
  constructor(public connection: Connection | null) {}
  async findById() { return this.connection; }
  async findByWorkspaceAndProvider() { return this.connection; }
  async save(connection: Connection) { this.connection = connection; }
  async updateStatus(_id: string, status: Connection["status"]) { if (this.connection) this.connection.status = status; }
}
function connection(provider = "github", status: Connection["status"] = ConnectionStatus.ACTIVE): Connection {
  return { id: "connection-1", workspaceId: "workspace-1", provider, status, scopes: [], createdAt: new Date(0), updatedAt: new Date(0) };
}
async function resolverFor(item = connection()) {
  const store = {
    async get(connectionId: string) { return connectionId === "connection-1" ? { accessToken: "github-secret-token" } : null; },
  } as unknown as CredentialStore;
  return new ConnectionResolver(new MemoryConnections(item), store);
}

test("definition exposes the exact commercial V1 surface and operation classes", () => {
  assert.equal(GitHubConnectorDefinition.id, "github");
  assert.deepEqual(GitHubConnectorDefinition.authentication, { type: "oauth2", credentialReference: "connectionId" });
  assert.deepEqual(GitHubConnectorDefinition.capabilities.map(({ id }) => id), Object.values(GITHUB_CAPABILITIES));
  assert.equal(GitHubConnectorDefinition.capabilities.find(({ id }) => id === GITHUB_CAPABILITIES.ISSUE_PREPARE)?.operationType, "PREPARE");
  assert.equal(GitHubConnectorDefinition.capabilities.find(({ id }) => id === GITHUB_CAPABILITIES.ISSUE_CREATE)?.operationType, "WRITE");
  assert.equal(GitHubConnectorDefinition.capabilities.find(({ id }) => id === GITHUB_CAPABILITIES.PULL_REQUEST_MERGE)?.operationType, "EXECUTE");
});

test("active GitHub connection resolves separately stored credentials", async () => {
  const resolved = await (await resolverFor()).resolve<{ accessToken: string }>("connection-1", "github");
  assert.equal(resolved.credentials.accessToken, "github-secret-token");
});

test("provider mismatch and inactive connections are rejected", async () => {
  await assert.rejects(() => resolverFor(connection("brevo")).then((resolver) => resolver.resolve("connection-1", "github")), (error: unknown) => error instanceof ConnectionResolutionError && error.code === "CONNECTION_PROVIDER_MISMATCH");
  await assert.rejects(() => resolverFor(connection("github", ConnectionStatus.DISABLED)).then((resolver) => resolver.resolve("connection-1", "github")), (error: unknown) => error instanceof ConnectionResolutionError && error.code === "CONNECTION_INACTIVE");
});

test("repository list is authenticated, paginated, and capped at 100 items", async () => {
  const transport = http([json([{ id: 1, name: "clara-os" }])]);
  const adapter = new GitHubConnectorAdapter(await resolverFor(), transport.fetch, "https://github.test/");
  const result = await adapter.execute("connection-1", { capability: GITHUB_CAPABILITIES.REPOSITORY_LIST, input: { page: 2, perPage: 500 } });
  assert.deepEqual(result.data, [{ id: 1, name: "clara-os" }]);
  assert.equal(transport.calls[0]?.url, "https://github.test/user/repos?page=2&per_page=100");
  assert.equal(new Headers(transport.calls[0]?.init?.headers).get("authorization"), "Bearer github-secret-token");
});

test("file read decodes wrapped base64 as UTF-8", async () => {
  const source = "Clara dit bonjour 👋\n";
  const encoded = Buffer.from(source).toString("base64");
  const transport = http([json({ name: "salut.txt", path: "docs/salut.txt", sha: "abc", size: Buffer.byteLength(source), encoding: "base64", content: `${encoded.slice(0, 8)}\n${encoded.slice(8)}` })]);
  const client = new GitHubClient({ accessToken: "token", fetch: transport.fetch });
  assert.equal((await client.readFile({ owner: "clara", repo: "os", path: "docs/salut.txt" })).content, source);
});

test("issues and pull requests can be listed and read", async () => {
  const transport = http([json([{ number: 4 }]), json({ number: 4, title: "Issue" }), json([{ number: 8 }]), json({ number: 8, title: "PR" })]);
  const client = new GitHubClient({ accessToken: "token", fetch: transport.fetch });
  assert.equal((await client.listIssues({ owner: "o", repo: "r" }))[0] && 4, 4);
  assert.equal((await client.getIssue({ owner: "o", repo: "r", issueNumber: 4 })).number, 4);
  assert.equal((await client.listPullRequests({ owner: "o", repo: "r" }))[0] && 8, 8);
  assert.equal((await client.getPullRequest({ owner: "o", repo: "r", pullNumber: 8 })).number, 8);
});

test("prepare validates connection but never performs an external write", async () => {
  const transport = http([]);
  const adapter = new GitHubConnectorAdapter(await resolverFor(), transport.fetch);
  const result = await adapter.execute("connection-1", { capability: GITHUB_CAPABILITIES.ISSUE_PREPARE, input: { owner: "o", repo: "r", title: "Draft" } });
  assert.deepEqual(result.data, { prepared: true, input: { owner: "o", repo: "r", title: "Draft" } });
  assert.equal(transport.calls.length, 0);
});

test("write performs the expected GitHub request", async () => {
  const transport = http([json({ number: 9 }, 201)]);
  const adapter = new GitHubConnectorAdapter(await resolverFor(), transport.fetch);
  await adapter.execute("connection-1", { capability: GITHUB_CAPABILITIES.ISSUE_CREATE, input: { owner: "o", repo: "r", title: "Commercial" } });
  assert.equal(transport.calls[0]?.url, "https://api.github.com/repos/o/r/issues");
  assert.equal(transport.calls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(transport.calls[0]?.init?.body)), { title: "Commercial" });
});

test("normalized errors never expose tokens or credential-shaped response fields", async () => {
  const transport = http([json({ message: "bad github-secret-token", access_token: "leaked", nested: { secret: "also-leaked" } }, 401)]);
  const client = new GitHubClient({ accessToken: "github-secret-token", fetch: transport.fetch });
  await assert.rejects(() => client.getRepository({ owner: "o", repo: "r" }), (error: unknown) => {
    assert.ok(error instanceof GitHubApiError);
    const serialized = JSON.stringify(error);
    assert.doesNotMatch(serialized, /github-secret-token|also-leaked|"leaked"/);
    assert.match(serialized, /REDACTED/);
    return true;
  });
});
