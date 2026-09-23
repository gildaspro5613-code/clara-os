/**
 * Server-only session lifecycle. Call issueAuthenticatedSession only after an
 * independent sign-in provider has verified the user's identity. Never expose
 * this function through an unauthenticated route.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import { CLARA_AUTH_COOKIE, sessionTokenDigest } from "./authenticated-workspace-session";

const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;

export function createOpaqueSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function authenticatedSessionCookie(token: string, secure: boolean) {
  if (!sessionTokenDigest(token)) throw new Error("INVALID_SESSION_TOKEN");
  return {
    name: CLARA_AUTH_COOKIE,
    value: token,
    options: {
      httpOnly: true as const,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_LIFETIME_SECONDS,
    },
  };
}

export function expiredSessionCookie(secure: boolean) {
  return {
    name: CLARA_AUTH_COOKIE,
    value: "",
    options: {
      httpOnly: true as const,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    },
  };
}

export async function issueAuthenticatedSession(verifiedUserId: string): Promise<string> {
  if (!verifiedUserId.trim() || verifiedUserId === "default") {
    throw new Error("VERIFIED_USER_REQUIRED");
  }
  // A sign-in adapter must first provision a verified user. No implicit
  // user creation: a forged identity must never create a usable session.
  const users = await sql`
    SELECT id FROM clara_auth_users WHERE id = ${verifiedUserId} LIMIT 1
  ` as { id: string }[];
  if (users.length !== 1) throw new Error("VERIFIED_USER_NOT_PROVISIONED");

  const token = createOpaqueSessionToken();
  const digest = sessionTokenDigest(token);
  if (!digest) throw new Error("SESSION_GENERATION_FAILED");
  await sql`
    INSERT INTO clara_auth_sessions (token_hash, user_id, expires_at)
    VALUES (${digest}, ${verifiedUserId},
            NOW() + INTERVAL '12 hours')
  `;
  return token;
}

export async function revokeAuthenticatedSession(token: string | undefined): Promise<void> {
  const digest = token ? sessionTokenDigest(token) : null;
  if (!digest) return;
  await sql`
    UPDATE clara_auth_sessions SET revoked_at = NOW()
    WHERE token_hash = ${digest} AND revoked_at IS NULL
  `;
}
