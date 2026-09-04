import assert from "node:assert/strict";
import test from "node:test";
import { GitHubReadExecutor } from "@/lib/capabilities/github-read/executor";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import type { CredentialStore } from "@/lib/connections/credential-store";
import { GitHubConnectorAdapter } from "@/lib/connectors/github/adapter";
import { GITHUB_CAPABILITIES } from "@/lib/connectors/github/definition";

type FetchCall = { url: string; authorization: string | null };
class Connections implements ConnectionRepository {
  constructor(private readonly value: Connection | null) {}
  requestedId?: string;
  async findById(id: string) { this.requestedId = id; return this.value; }
  async findByWorkspaceAndProvider() { return this.value; }
  async save() {}
  async updateStatus() {}
}
function metadata(provider = "github", status: Connection["status"] = ConnectionStatus.ACTIVE): Connection {
  return { id: "github-connection", workspaceId: "workspace", provider, status, scopes: ["repo"], createdAt: new Date(0), updatedAt: new Date(0) };
}
function harness(value: Connection | null = metadata()) {
  const repository = new Connections(value);
  const token = "never-return-this-token";
  const credentials = { async get(id: string) { return id === "github-connection" ? { accessToken: token } : null; } } as CredentialStore;
  const calls: FetchCall[] = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), authorization: new Headers(init?.headers).get("authorization") });
    return new Response(JSON.stringify([{ id: 1, name: "clara-os" }]), { status: 200, headers: { "content-type": "application/json" } });
  };
  const adapter = new GitHubConnectorAdapter(new ConnectionResolver(repository, credentials), fetcher);
  const executor = new GitHubReadExecutor(() => adapter);
  return { repository, calls, token, executor };
}

test("operational capability dispatch resolves the connection and returns normalized GitHub data", async () => {
  const { executor, repository, calls, token } = harness();
  const result = await executor.execute(GITHUB_CAPABILITIES.REPOSITORY_LIST, { connectionId: "github-connection", input: { perPage: 10 } });
  assert.equal(repository.requestedId, "github-connection");
  assert.equal(calls.length, 1);
  assert.match(calls[0]!.authorization!, /^Bearer /);
  assert.deepEqual(result, { capabilityId: GITHUB_CAPABILITIES.REPOSITORY_LIST, success: true, provider: "github", connectionId: "github-connection", data: [{ id: 1, name: "clara-os" }] });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
});

test("missing, inactive, and provider-mismatched GitHub connections return typed safe failures", async () => {
  const cases = [
    { value: null, code: "CONNECTION_NOT_FOUND" },
    { value: metadata("github", ConnectionStatus.DISABLED), code: "CONNECTION_INACTIVE" },
    { value: metadata("google"), code: "CONNECTION_PROVIDER_MISMATCH" },
  ];
  for (const item of cases) {
    const { executor, calls, token } = harness(item.value);
    const result = await executor.execute(GITHUB_CAPABILITIES.REPOSITORY_READ, { connectionId: "github-connection", input: { owner: "o", repo: "r" } });
    assert.equal(result.success, false);
    assert.equal(result.error?.code, item.code);
    assert.equal(calls.length, 0);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(token));
  }
});

test("missing connection id and non-READ GitHub capabilities are rejected before adapter dispatch", async () => {
  const { executor, calls } = harness();
  const missing = await executor.execute(GITHUB_CAPABILITIES.REPOSITORY_LIST, { input: {} });
  assert.equal(missing.error?.code, "CONNECTION_REQUIRED");
  const unsupported = await executor.execute(GITHUB_CAPABILITIES.ISSUE_CREATE, { connectionId: "github-connection", input: { owner: "o", repo: "r", title: "No" } });
  assert.equal(unsupported.error?.code, "UNSUPPORTED_CAPABILITY");
  assert.equal(calls.length, 0);
});
