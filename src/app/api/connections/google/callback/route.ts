import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { OAuthCallbackService } from "@/lib/auth/oauth/service";
import { OAuthError } from "@/lib/auth/oauth/error";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { googleConfig } from "@/lib/config/google";
const GOOGLE_OAUTH_COOKIE = "clara_google_oauth_nonce";

export const dynamic = "force-dynamic";

function finishRedirect(request: Request, status: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/?google=${status}`, process.env.GOOGLE_REDIRECT_URI));
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/api/connections/google/callback",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stateValue = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const nonce = cookieHeader
    .split(";")
    .map((value) => value.trim().split("="))
    .find(([name]) => name === GOOGLE_OAUTH_COOKIE)?.[1];
  if (!stateValue || !nonce) return finishRedirect(request, "invalid_state");
  const repository = new DatabaseConnectionRepository();
  try {
    const credentialStore = new CredentialStore();
    await new OAuthCallbackService(oauthProviders, repository, credentialStore).complete({
      provider: "google", state: stateValue, nonce: decodeURIComponent(nonce), code,
      redirectUri: googleConfig.redirectUri, workspaceId: CURRENT_WORKSPACE_ID,
    });
    return finishRedirect(request, "connected");
  } catch (error) {
    if (error instanceof OAuthError && error.code === "REFRESH_UNAVAILABLE") {
      return finishRedirect(request, "missing_refresh_token");
    }
    if (error instanceof OAuthError && ["INVALID_STATE", "EXPIRED_STATE", "PROVIDER_MISMATCH", "CONNECTION_MISMATCH", "MISSING_AUTHORIZATION_CODE"].includes(error.code)) {
      return finishRedirect(request, "invalid_state");
    }
    return finishRedirect(request, "oauth_error");
  }
}
