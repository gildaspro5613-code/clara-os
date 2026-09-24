import { NextResponse, type NextRequest } from "next/server";
import { authenticatedMicrosoftWorkspace } from "@/lib/connectors/microsoft/security/authenticated-microsoft-workspace";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { OAuthCallbackService } from "@/lib/auth/oauth/service";
import { OAuthError } from "@/lib/auth/oauth/error";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { microsoftConfig } from "@/lib/config/microsoft";

const MICROSOFT_OAUTH_COOKIE = "clara_microsoft_oauth_nonce";
export const dynamic = "force-dynamic";

function finishRedirect(request: Request, status: string): NextResponse {
  const base = microsoftConfig.redirectUri || new URL(request.url).origin;
  const response = NextResponse.redirect(new URL(`/?microsoft=${status}`, base));
  response.cookies.set(MICROSOFT_OAUTH_COOKIE, "", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 0, path: "/api/connections/microsoft/callback",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const workspace = await authenticatedMicrosoftWorkspace(request.headers.get("cookie"), "connections:manage");
  if (!workspace) return finishRedirect(request, "auth_required");
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return finishRedirect(request, "access_denied");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const matches = (request.headers.get("cookie") ?? "").split(";").map(v => v.trim()).filter(v => v.startsWith(`${MICROSOFT_OAUTH_COOKIE}=`));
  const nonce = matches.length === 1 ? matches[0].slice(MICROSOFT_OAUTH_COOKIE.length + 1) : undefined;
  if (!state || !nonce) return finishRedirect(request, "invalid_state");
  try {
    await new OAuthCallbackService(oauthProviders, new DatabaseConnectionRepository(), new CredentialStore()).complete({
      provider: "microsoft", state, nonce, code, redirectUri: microsoftConfig.redirectUri,
      workspaceId: workspace.workspaceId,
    });
    return finishRedirect(request, "connected");
  } catch (error) {
    if (error instanceof OAuthError && error.code === "REFRESH_UNAVAILABLE") return finishRedirect(request, "missing_refresh_token");
    if (error instanceof OAuthError && ["INVALID_STATE","EXPIRED_STATE","PROVIDER_MISMATCH","CONNECTION_MISMATCH","MISSING_AUTHORIZATION_CODE"].includes(error.code)) return finishRedirect(request, "invalid_state");
    return finishRedirect(request, "oauth_error");
  }
}
