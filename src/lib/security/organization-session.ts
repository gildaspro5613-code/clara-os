import { createHmac, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

const ORGANIZATION_SESSION_COOKIE = "clara_org_session";

interface OrganizationSessionPayload {
  organizationId: string;
  userId: string;
  expiresAt: number;
}

function sessionSecret(): string {
  const value = process.env.CLARA_ORGANIZATION_SESSION_SECRET?.trim();
  if (!value) {
    throw new Error("Missing CLARA_ORGANIZATION_SESSION_SECRET configuration.");
  }
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

function decodeSession(value: string): OrganizationSessionPayload | undefined {
  const [body, signature] = value.split(".");
  if (!body || !signature) return undefined;

  const expected = sign(body);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return undefined;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<OrganizationSessionPayload>;

    if (
      typeof payload.organizationId !== "string" ||
      !payload.organizationId.trim() ||
      typeof payload.userId !== "string" ||
      !payload.userId.trim() ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now()
    ) {
      return undefined;
    }

    return {
      organizationId: payload.organizationId.trim(),
      userId: payload.userId.trim(),
      expiresAt: payload.expiresAt,
    };
  } catch {
    return undefined;
  }
}

/**
 * Resolves organization and user identity only from a server-signed session
 * cookie. This is a trust boundary, not a login system. A future authenticated
 * session issuer must mint the cookie after validating user membership in the
 * organization.
 */
export function resolveOrganizationSession(
  request: NextRequest,
): OrganizationSessionPayload | undefined {
  const raw = request.cookies.get(ORGANIZATION_SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : undefined;
}

export function createOrganizationSessionValue(input: {
  organizationId: string;
  userId: string;
  expiresAt: number;
}): string {
  const organizationId = input.organizationId.trim();
  const userId = input.userId.trim();
  if (!organizationId) throw new Error("organizationId is required.");
  if (!userId) throw new Error("userId is required.");
  if (!Number.isFinite(input.expiresAt) || input.expiresAt <= Date.now()) {
    throw new Error("A future expiresAt is required.");
  }

  const body = Buffer.from(
    JSON.stringify({ organizationId, userId, expiresAt: input.expiresAt }),
  ).toString("base64url");

  return `${body}.${sign(body)}`;
}

export { ORGANIZATION_SESSION_COOKIE };
