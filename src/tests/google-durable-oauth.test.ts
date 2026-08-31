import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { Credentials, OAuth2Client } from "google-auth-library";
import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  CredentialStore,
  type CredentialPersistence,
} from "@/lib/connections/credential-store";
import { toPublicGoogleConnection } from "@/lib/connections/google-connection-public";
import {
  GOOGLE_REAUTH_REQUIRED,
  GoogleReauthRequiredError,
} from "@/lib/connectors/google/auth/google-auth-error";
import { GoogleAuth } from "@/lib/connectors/internal/google/auth/google-auth";
import { mergeGoogleCredentials } from "@/lib/connectors/google/oauth/google-oauth";
import {
  signGoogleOAuthState,
  verifyGoogleOAuthState,
} from "@/lib/connectors/google/oauth/google-oauth-state";

class MemoryCredentials implements CredentialPersistence {
  readonly values = new Map<string, string>();
  async load(id: string) { return this.values.get(id) ?? null; }
  async save(id: string, value: string) { this.values.set(id, value); }
}

class MemoryConnections implements ConnectionRepository {
  constructor(public connection: Connection) {}
  async findById(id: string) { return id === this.connection.id ? this.connection : null; }
  async findByWorkspaceAndProvider(workspaceId: string, provider: string) {
    return workspaceId === this.connection.workspaceId &&
      provider === this.connection.provider ? this.connection : null;
  }
  async save(connection: Connection) { this.connection = connection; }
  async updateStatus(_id: string, status: Connection["status"]) {
    this.connection = { ...this.connection, status };
  }
}

const connection: Connection = {
  id: "connection-1",
  workspaceId: "default",
  provider: "google",
  status: ConnectionStatus.ACTIVE,
  scopes: ["drive"],
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

test("CredentialStore encrypts credentials and retrieves them by connectionId", async () => {
  const persistence = new MemoryCredentials();
  const store = new CredentialStore(persistence, Buffer.alloc(32, 7));
  await store.set("connection-1", { access_token: "access", refresh_token: "refresh" });
  const encrypted = persistence.values.get("connection-1") ?? "";
  assert.ok(!encrypted.includes("access") && !encrypted.includes("refresh"));
  assert.deepEqual(await store.get("connection-1"), {
    access_token: "access",
    refresh_token: "refresh",
  });
  assert.equal(await store.get("another-connection"), null);
});

test("Connection and its public representation never expose credentials", () => {
  assert.equal("access_token" in connection, false);
  assert.equal("refresh_token" in connection, false);
  const publicValue = toPublicGoogleConnection(connection);
  assert.deepEqual(Object.keys(publicValue).sort(), [
    "connectUrl", "connected", "connectionId", "provider", "scopes", "status",
  ]);
  assert.equal(JSON.stringify(publicValue).includes("token"), false);
});

test("OAuth state is signed, expires, and is bound to the CSRF cookie nonce", () => {
  const state = signGoogleOAuthState({
    connectionId: "connection-1",
    workspaceId: "default",
    nonce: "cookie-nonce",
    expiresAt: 2_000,
  }, "state-secret");
  assert.equal(
    verifyGoogleOAuthState(state, "cookie-nonce", "state-secret", 1_000)?.connectionId,
    "connection-1",
  );
  assert.equal(verifyGoogleOAuthState(state, "wrong-nonce", "state-secret", 1_000), null);
  assert.equal(verifyGoogleOAuthState(state, "cookie-nonce", "state-secret", 3_000), null);
  assert.equal(verifyGoogleOAuthState(`${state}x`, "cookie-nonce", "state-secret", 1_000), null);
});

test("credential updates preserve an existing refresh token", () => {
  assert.deepEqual(
    mergeGoogleCredentials(
      { refresh_token: "durable", access_token: "old" },
      { access_token: "new", expiry_date: 42 },
    ),
    { refresh_token: "durable", access_token: "new", expiry_date: 42 },
  );
});

test("GoogleAuth persists refreshed credentials without losing refresh_token", async () => {
  const persistence = new MemoryCredentials();
  const store = new CredentialStore(persistence, Buffer.alloc(32, 9));
  await store.set<Credentials>(connection.id, {
    refresh_token: "durable",
    access_token: "old",
  });
  class FakeClient extends EventEmitter {
    credentials: Credentials = {};
    setCredentials(value: Credentials) { this.credentials = value; }
    async request() { return { data: {} }; }
  }
  const fake = new FakeClient();
  await new GoogleAuth(
    new MemoryConnections(connection),
    store,
    () => fake as unknown as OAuth2Client,
  ).createClient();
  fake.emit("tokens", { access_token: "new", expiry_date: 123 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(await store.get(connection.id), {
    refresh_token: "durable",
    access_token: "new",
    expiry_date: 123,
  });
});

test("invalid_grant marks the connection for reconnect and raises a stable error", async () => {
  const persistence = new MemoryCredentials();
  const store = new CredentialStore(persistence, Buffer.alloc(32, 5));
  await store.set(connection.id, { refresh_token: "durable" });
  const connections = new MemoryConnections(connection);
  class InvalidGrantClient extends EventEmitter {
    setCredentials() {}
    async request() {
      throw { response: { data: { error: "invalid_grant" } } };
    }
  }
  const client = await new GoogleAuth(
    connections,
    store,
    () => new InvalidGrantClient() as unknown as OAuth2Client,
  ).createClient();
  await assert.rejects(
    () => client.request({ url: "https://example.invalid" }),
    (error) => error instanceof GoogleReauthRequiredError &&
      error.code === GOOGLE_REAUTH_REQUIRED,
  );
  assert.equal(connections.connection.status, ConnectionStatus.RECONNECT_REQUIRED);
});
