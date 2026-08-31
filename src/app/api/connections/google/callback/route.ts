import { NextResponse } from "next/server";
import type { Credentials } from "google-auth-library";
import { ConnectionStatus } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import {
  createGoogleOAuthClient,
  mergeGoogleCredentials,
} from "@/lib/connectors/google/oauth/google-oauth";
import { verifyGoogleOAuthState } from "@/lib/connectors/google/oauth/google-oauth-state";
const GOOGLE_OAUTH_COOKIE = "clara_google_oauth_nonce";

export const dynamic = "force-dynamic";

function finishRedirect(request: Request, status: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/?google=${status}`, request.url));
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
  if (!stateValue || !code || !nonce) return finishRedirect(request, "invalid_state");

  const state = verifyGoogleOAuthState(stateValue, decodeURIComponent(nonce));
  if (!state || state.workspaceId !== CURRENT_WORKSPACE_ID) {
    return finishRedirect(request, "invalid_state");
  }
  const repository = new DatabaseConnectionRepository();
  const connection = await repository.findById(state.connectionId);
  if (!connection || connection.workspaceId !== state.workspaceId || connection.provider !== "google") {
    return finishRedirect(request, "invalid_state");
  }

  try {
    const client = createGoogleOAuthClient();
    const { tokens } = await client.getToken(code);
    const credentialStore = new CredentialStore();
    const current = await credentialStore.get<Credentials>(connection.id);
    const credentials = mergeGoogleCredentials(current, tokens);
    if (!credentials.refresh_token) return finishRedirect(request, "missing_refresh_token");
    await credentialStore.set(connection.id, credentials);
    await repository.updateStatus(connection.id, ConnectionStatus.ACTIVE);
    return finishRedirect(request, "connected");
  } catch {
    return finishRedirect(request, "oauth_error");
  }
}
