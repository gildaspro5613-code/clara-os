import { createHmac, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

const AUTHENTICATED_ACTOR_SESSION_COOKIE = "clara_actor_session";

export interface AuthenticatedActorSession {
  userId: string;
  firstName?: string;
  organizationId?: string;
  workspaceId?: string;
  expiresAt: number;
}

function sessionSecret(): string {
  const value = process.env.CLARA_AUTH_SESSION_SECRET?.trim();
  if (!value) {
    throw new Error("Missing CLARA_AUTH_SESSION_SECRET configuration.");
  }
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function decodeSession(value: string): AuthenticatedActorSession | undefined {
  const [body, signature] = value.split(".");
  if (!body || !signature) return undefined;

  const expected = sign(body);
  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);

  if (received.length !== wanted.length || !timingSafeEqual(received, wanted)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<AuthenticatedActorSession>;

    const userId = cleanString(payload.userId);
    if (
      !userId ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return undefined;
    }

    return {
      userId,
      firstName: cleanString(payload.firstName),
      organizationId: cleanString(payload.organizationId),
      workspaceId: cleanString(payload.workspaceId),
      expiresAt: payload.expiresAt,
    };
  } catch {
    return undefined;
  }
}

/**
 * Resolves Clara application identity only from a server-signed cookie.
 *
 * This is the authenticated-session trust boundary used by provider-neutral
 * execution. It intentionally does not implement login or provider OAuth.
 * A trusted authentication flow may mint the cookie after validating the user.
 */
export function resolveAuthenticatedActorSession(
  request: NextRequest,
): AuthenticatedActorSession | undefined {
  const raw = request.cookies.get(AUTHENTICATED_ACTOR_SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : undefined;
}

/**
 * Server-only helper for a future trusted authentication issuer.
 */
export function createAuthenticatedActorSessionValue(
  input: AuthenticatedActorSession,
): string {
  const userId = input.userId.trim();
  if (!userId) throw new Error("userId is required.");
  if (!Number.isFinite(input.expiresAt) || input.expiresAt <= Date.now()) {
    throw new Error("A future expiresAt is required.");
  }

  const body = Buffer.from(
    JSON.stringify({
      userId,
      firstName: cleanString(input.firstName),
      organizationId: cleanString(input.organizationId),
      workspaceId: cleanString(input.workspaceId),
      expiresAt: input.expiresAt,
    }),
  ).toString("base64url");

  return `${body}.${sign(body)}`;
}

export { AUTHENTICATED_ACTOR_SESSION_COOKIE };
