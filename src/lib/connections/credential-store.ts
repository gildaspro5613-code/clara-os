import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { sql } from "@/lib/core/store/database";

export interface CredentialPersistence {
  load(connectionId: string): Promise<string | null>;
  save(connectionId: string, encryptedPayload: string): Promise<void>;
}

export class DatabaseCredentialPersistence
implements CredentialPersistence {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_connection_credentials (
        connection_id TEXT PRIMARY KEY
          REFERENCES clara_connections(id) ON DELETE CASCADE,
        encrypted_payload TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    this.initialized = true;
  }

  async load(connectionId: string): Promise<string | null> {
    await this.initialize();
    const rows = await sql`
      SELECT encrypted_payload FROM clara_connection_credentials
      WHERE connection_id = ${connectionId} LIMIT 1
    ` as Array<{ encrypted_payload: string }>;
    return rows[0]?.encrypted_payload ?? null;
  }

  async save(connectionId: string, encryptedPayload: string): Promise<void> {
    await this.initialize();
    await sql`
      INSERT INTO clara_connection_credentials
        (connection_id, encrypted_payload, updated_at)
      VALUES (${connectionId}, ${encryptedPayload}, NOW())
      ON CONFLICT (connection_id) DO UPDATE SET
        encrypted_payload = EXCLUDED.encrypted_payload,
        updated_at = NOW()
    `;
  }
}

function encryptionKey(value = process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY): Buffer {
  if (!value) {
    throw new Error("CLARA_CREDENTIALS_ENCRYPTION_KEY is not configured.");
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CLARA_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return key;
}

export class CredentialStore {
  constructor(
    private readonly persistence: CredentialPersistence =
      new DatabaseCredentialPersistence(),
    private readonly key: Buffer = encryptionKey(),
  ) {
    if (key.length !== 32) throw new Error("CredentialStore requires a 32-byte key.");
  }

  async get<T extends object>(connectionId: string): Promise<T | null> {
    const payload = await this.persistence.load(connectionId);
    if (!payload) return null;
    const envelope = JSON.parse(payload) as {
      iv: string;
      tag: string;
      ciphertext: string;
    };
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const cleartext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]);
    return JSON.parse(cleartext.toString("utf8")) as T;
  }

  async set<T extends object>(connectionId: string, credentials: T): Promise<void> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(credentials), "utf8"),
      cipher.final(),
    ]);
    await this.persistence.save(connectionId, JSON.stringify({
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    }));
  }
}
