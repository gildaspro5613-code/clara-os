import { NextResponse, type NextRequest } from "next/server";
import { revokeAuthenticatedSession, expiredSessionCookie } from "@/lib/auth/authenticated-session-lifecycle";
import { readAuthCookie } from "@/lib/connectors/microsoft/security/request-authorization";
import { isSameOriginRequest } from "@/lib/auth/session-request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Require a deployment-configured origin, not a user-controlled Host header.
  const configuredOrigin = process.env.CLARA_AUTH_APP_ORIGIN;
  if (!isSameOriginRequest(request.headers.get("origin"), configuredOrigin)) {
    return NextResponse.json({ error: "ORIGIN_DENIED" }, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const token = readAuthCookie(request.headers.get("cookie"));
  try {
    if (token) await revokeAuthenticatedSession(token);
  } catch {
    return NextResponse.json({ error: "SESSION_REVOCATION_UNAVAILABLE" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const response = NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" },
  });
  response.cookies.set(expiredSessionCookie(true));
  return response;
}
