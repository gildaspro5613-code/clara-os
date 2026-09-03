import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore, type CredentialPersistence } from "@/lib/connections/credential-store";
import { OAuthError } from "@/lib/auth/oauth/error";
import { OAuthProviderRegistry } from "@/lib/auth/oauth/registry";
import { OAuthAuthorizationService, OAuthCallbackService, OAuthRefreshService, oauthCredentialsRequireRefresh } from "@/lib/auth/oauth/service";
import { safeOAuthRedirectPath, signOAuthState, verifyOAuthState } from "@/lib/auth/oauth/state";
import type { OAuthProviderDefinition, OAuthTokenSet } from "@/lib/auth/oauth/types";
import { createBrevoOAuthProvider } from "@/lib/connectors/brevo/oauth";

class MemoryPersistence implements CredentialPersistence {
  values = new Map<string, string>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, value: string) { this.values.set(id, value); }
}
class MemoryConnections implements ConnectionRepository {
  constructor(public connection: Connection) {}
  async findById(id: string) { return id === this.connection.id ? this.connection : null; }
  async findByWorkspaceAndProvider(workspace: string, provider: string) {
    return workspace === this.connection.workspaceId && provider === this.connection.provider ? this.connection : null;
  }
  async save(value: Connection) { this.connection = value; }
  async updateStatus(_id: string, status: Connection["status"]) { this.connection = { ...this.connection, status }; }
}
const connection: Connection = {
  id: "connection-1", workspaceId: "workspace-1", provider: "example",
  status: ConnectionStatus.PENDING_AUTHENTICATION, scopes: ["read"],
  createdAt: new Date(0), updatedAt: new Date(0),
};
function provider(overrides: Partial<OAuthProviderDefinition> = {}): OAuthProviderDefinition {
  return {
    id: "example", defaultScopes: ["read"],
    buildAuthorizationUrl(request) {
      const url = new URL("https://provider.test/authorize");
      url.searchParams.set("state", request.state);
      url.searchParams.set("redirect_uri", request.redirectUri);
      url.searchParams.set("scope", request.scopes?.join(" ") ?? "");
      return url;
    },
    async exchangeCode() { return { accessToken: "access", refreshToken: "refresh", expiresAt: 2_000 }; },
    async refresh() { return { accessToken: "new-access", expiresAt: 4_000 }; },
    ...overrides,
  };
}

test("provider lookup and generic authorization URL generation", () => {
  const registry = new OAuthProviderRegistry([provider()]);
  assert.equal(registry.get("example").id, "example");
  assert.throws(() => registry.get("missing"), (error) => error instanceof OAuthError && error.code === "UNSUPPORTED_PROVIDER");
  process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY = "state-secret";
  const url = new OAuthAuthorizationService(registry).create({
    provider: "example", connectionId: "connection-1", workspaceId: "workspace-1",
    nonce: "nonce", redirectUri: "https://clara.test/callback", redirectPath: "/done", expiresAt: 2_000,
  });
  assert.equal(url.origin, "https://provider.test");
  assert.equal(url.searchParams.get("scope"), "read");
  const state = verifyOAuthState(url.searchParams.get("state")!, { nonce: "nonce", provider: "example" }, "state-secret", 1_000);
  assert.equal(state.connectionId, "connection-1");
});

test("signed state rejects tampering, expiry, provider mismatch, and open redirects", () => {
  const signed = signOAuthState({ provider: "example", connectionId: "connection-1", workspaceId: "workspace-1", nonce: "nonce", expiresAt: 2_000, redirectPath: "//attacker.test" }, "secret");
  assert.equal(verifyOAuthState(signed, { nonce: "nonce", provider: "example" }, "secret", 1_000).redirectPath, "/");
  assert.throws(() => verifyOAuthState(`${signed}x`, { nonce: "nonce", provider: "example" }, "secret", 1_000), /INVALID_STATE/);
  assert.throws(() => verifyOAuthState(signed, { nonce: "nonce", provider: "wrong" }, "secret", 1_000), /PROVIDER_MISMATCH/);
  assert.throws(() => verifyOAuthState(signed, { nonce: "nonce", provider: "example" }, "secret", 3_000), /EXPIRED_STATE/);
  assert.equal(safeOAuthRedirectPath("https://attacker.test/path"), "/");
});

test("callback exchanges code, persists normalized credentials, and activates connection", async () => {
  const persistence = new MemoryPersistence();
  const store = new CredentialStore(persistence, Buffer.alloc(32, 1));
  const connections = new MemoryConnections(connection);
  const signed = signOAuthState({ provider: "example", connectionId: connection.id, workspaceId: connection.workspaceId, nonce: "nonce", expiresAt: Date.now() + 1_000, redirectPath: "/done" }, "secret");
  process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY = "secret";
  const result = await new OAuthCallbackService(new OAuthProviderRegistry([provider()]), connections, store).complete({
    provider: "example", state: signed, nonce: "nonce", code: "code", redirectUri: "https://clara.test/callback", workspaceId: "workspace-1",
  });
  assert.deepEqual(result.credentials, { accessToken: "access", refreshToken: "refresh", expiresAt: 2_000 });
  assert.equal(connections.connection.status, ConnectionStatus.ACTIVE);
  assert.deepEqual(await store.get(connection.id), result.credentials);
  assert.doesNotMatch(persistence.values.get(connection.id)!, /access|refresh/);
});

test("callback state is bound to its provider and connection", async () => {
  const signed = signOAuthState({ provider: "example", connectionId: "another", workspaceId: "workspace-1", nonce: "nonce", expiresAt: Date.now() + 1_000, redirectPath: "/" }, "secret");
  process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY = "secret";
  const store = new CredentialStore(new MemoryPersistence(), Buffer.alloc(32, 2));
  await assert.rejects(
    () => new OAuthCallbackService(new OAuthProviderRegistry([provider()]), new MemoryConnections(connection), store).complete({ provider: "example", state: signed, nonce: "nonce", code: "code", redirectUri: "x", workspaceId: "workspace-1" }),
    (error) => error instanceof OAuthError && error.code === "CONNECTION_MISMATCH",
  );
});

test("on-demand refresh preserves refresh token and persists the update", async () => {
  const store = new CredentialStore(new MemoryPersistence(), Buffer.alloc(32, 3));
  await store.set<OAuthTokenSet>(connection.id, { accessToken: "old", refreshToken: "durable", expiresAt: 1_000 });
  assert.equal(oauthCredentialsRequireRefresh({ accessToken: "old", expiresAt: 1_000 }, 1_000), true);
  const refreshed = await new OAuthRefreshService(new OAuthProviderRegistry([provider()]), store)
    .refreshIfNeeded(connection.id, "example", { now: 1_000 });
  assert.deepEqual(refreshed, { accessToken: "new-access", refreshToken: "durable", expiresAt: 4_000 });
  assert.deepEqual(await store.get(connection.id), refreshed);
});

test("OAuth errors redact provider secrets and codes", () => {
  const error = new OAuthError("CODE_EXCHANGE_FAILED");
  assert.equal(JSON.stringify(error), '{"name":"OAuthError","code":"CODE_EXCHANGE_FAILED","message":"CODE_EXCHANGE_FAILED"}');
  assert.doesNotMatch(JSON.stringify(error), /client-secret|access-token|authorization-code/);
});

test("Brevo adapter builds authorization URL and normalizes code and refresh exchanges", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  const responses = [
    { access_token: "first", refresh_token: "refresh", token_type: "Bearer", expires_in: 60, scope: "contacts campaigns" },
    { access_token: "second", token_type: "Bearer", expires_in: 120 },
  ];
  const brevo = createBrevoOAuthProvider({ clientId: "client", clientSecret: "secret", scopes: ["contacts"] }, async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body) });
    return Response.json(responses.shift());
  }, () => 1_000);
  const authorization = brevo.buildAuthorizationUrl({ redirectUri: "https://clara.test/brevo", state: "state", scopes: brevo.defaultScopes });
  assert.equal(authorization.searchParams.get("client_id"), "client");
  assert.equal(authorization.searchParams.get("scope"), "contacts");
  assert.deepEqual(await brevo.exchangeCode({ code: "code", redirectUri: "https://clara.test/brevo" }), {
    accessToken: "first", refreshToken: "refresh", tokenType: "Bearer", expiresAt: 61_000, scope: ["contacts", "campaigns"],
  });
  assert.equal(calls[0]?.body.includes("grant_type=authorization_code"), true);
  assert.deepEqual(await brevo.refresh({ refreshToken: "refresh" }), {
    accessToken: "second", refreshToken: undefined, tokenType: "Bearer", expiresAt: 121_000, scope: undefined,
  });
  assert.equal(calls[1]?.body.includes("grant_type=refresh_token"), true);
});
