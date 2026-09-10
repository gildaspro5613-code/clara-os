import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { google } from "googleapis";

import { googleConfig } from "@/lib/config/google";
import { ConnectionAccountRepository } from "@/lib/runtime/connection-account-repository";

const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
] as const;

interface GoogleOAuthStatePayload {
  organizationId: string;
  connectionAccountId: string;
  nonce: string;
  expiresAt: number;
}

export interface GoogleOAuthStartResult {
  connectionAccountId: string;
  authorizationUrl: string;
}

export interface GoogleOAuthTokens {
  accessToken?: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiryDate?: number;
}

function stateSecret(): string {
  const value = process.env.CLARA_OAUTH_STATE_SECRET?.trim();
  if (!value) {
    throw new Error("Missing CLARA_OAUTH_STATE_SECRET configuration.");
  }
  return value;
}

function validateOAuthConfiguration(): void {
  const required = [
    ["GOOGLE_CLIENT_ID", googleConfig.clientId],
    ["GOOGLE_CLIENT_SECRET", googleConfig.clientSecret],
    ["GOOGLE_REDIRECT_URI", googleConfig.redirectUri],
  ] as const;

  for (const [name, value] of required) {
    if (!value) throw new Error(`Missing Google OAuth configuration: ${name}`);
  }
}

function encodeState(payload: GoogleOAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decodeState(state: string): GoogleOAuthStatePayload {
  const [body, signature] = state.split(".");
  if (!body || !signature) throw new Error("Invalid OAuth state.");

  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid OAuth state signature.");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<GoogleOAuthStatePayload>;
  if (
    typeof payload.organizationId !== "string" ||
    typeof payload.connectionAccountId !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.expiresAt !== "number"
  ) {
    throw new Error("Invalid OAuth state payload.");
  }
  if (payload.expiresAt < Date.now()) throw new Error("Expired OAuth state.");

  return payload as GoogleOAuthStatePayload;
}

/**
 * Organization-scoped Google OAuth flow.
 *
 * This service deliberately does not persist OAuth tokens. A callback must pass
 * exchanged tokens to Clara's credential vault and persist only the resulting
 * opaque credential reference on the ConnectionAccount.
 */
export class GoogleOrganizationOAuth {
  private readonly accounts = new ConnectionAccountRepository();

  public async start(organizationId: string, label?: string): Promise<GoogleOAuthStartResult> {
    validateOAuthConfiguration();

    const account = await this.accounts.createPending({
      organizationId,
      providerId: "google.workspace",
      label,
    });

    const oauth = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri,
    );

    const state = encodeState({
      organizationId,
      connectionAccountId: account.id,
      nonce: randomBytes(18).toString("base64url"),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return {
      connectionAccountId: account.id,
      authorizationUrl: oauth.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: true,
        scope: [...GOOGLE_WORKSPACE_SCOPES],
        state,
      }),
    };
  }

  public verifyState(state: string): GoogleOAuthStatePayload {
    return decodeState(state);
  }

  public async exchangeCode(code: string): Promise<GoogleOAuthTokens> {
    validateOAuthConfiguration();
    const oauth = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri,
    );
    const { tokens } = await oauth.getToken(code);

    return {
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      scope: tokens.scope ?? undefined,
      tokenType: tokens.token_type ?? undefined,
      expiryDate: tokens.expiry_date ?? undefined,
    };
  }
}
