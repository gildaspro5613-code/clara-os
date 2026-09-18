import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { OAuthCallbackService } from "@/lib/auth/oauth/service";
import { OAuthError } from "@/lib/auth/oauth/error";
import { oauthProviders } from "@/lib/auth/oauth/providers";

export const dynamic = "force-dynamic";
const BREVO_OAUTH_COOKIE = "clara_brevo_oauth_nonce";

function finishRedirect(request: Request, status: string): NextResponse {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? request.url;
  const response = NextResponse.redirect(new URL(`/?brevo=${status}`, base));
  response.cookies.set(BREVO_OAUTH_COOKIE, "", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 0, path: "/api/connections/brevo/callback",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return finishRedirect(request, "access_denied");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const nonce = (request.headers.get("cookie") ?? "")
    .split(";").map((value) => value.trim().split("="))
    .find(([name]) => name === BREVO_OAUTH_COOKIE)?.[1];
  if (!state || !nonce) return finishRedirect(request, "invalid_state");
  const redirectUri = process.env.BREVO_REDIRECT_URI;
  if (!redirectUri) return finishRedirect(request, "oauth_error");

  try {
    await new OAuthCallbackService(
      oauthProviders, new DatabaseConnectionRepository(), new CredentialStore(),
    ).complete({
      provider: "brevo", state, nonce: decodeURIComponent(nonce), code,
      redirectUri, workspaceId: CURRENT_WORKSPACE_ID,
    });
    return finishRedirect(request, "connected");
  } catch (error) {
    if (error instanceof OAuthError && error.code === "REFRESH_UNAVAILABLE") return finishRedirect(request, "missing_refresh_token");
    if (error instanceof OAuthError && ["INVALID_STATE","EXPIRED_STATE","PROVIDER_MISMATCH","CONNECTION_MISMATCH","MISSING_AUTHORIZATION_CODE"].includes(error.code)) {
      return finishRedirect(request, "invalid_state");
    }
    return finishRedirect(request, "oauth_error");
  }
}
