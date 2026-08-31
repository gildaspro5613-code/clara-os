import { NextResponse } from "next/server";
import { ConnectionStatus } from "@/lib/connections/connection";
import {
  createPendingGoogleConnection,
  DatabaseConnectionRepository,
} from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import {
  GOOGLE_OAUTH_SCOPES,
  createGoogleOAuthClient,
} from "@/lib/connectors/google/oauth/google-oauth";
import {
  createGoogleOAuthNonce,
  signGoogleOAuthState,
} from "@/lib/connectors/google/oauth/google-oauth-state";

export const dynamic = "force-dynamic";
const GOOGLE_OAUTH_COOKIE = "clara_google_oauth_nonce";

export async function GET() {
  const repository = new DatabaseConnectionRepository();
  let connection = await repository.findByWorkspaceAndProvider(
    CURRENT_WORKSPACE_ID,
    "google",
  );
  if (!connection) {
    connection = createPendingGoogleConnection(
      CURRENT_WORKSPACE_ID,
      [...GOOGLE_OAUTH_SCOPES],
    );
  } else {
    connection = {
      ...connection,
      status: connection.status === ConnectionStatus.ACTIVE
        ? ConnectionStatus.ACTIVE
        : ConnectionStatus.PENDING_AUTHENTICATION,
      scopes: [...GOOGLE_OAUTH_SCOPES],
      updatedAt: new Date(),
    };
  }
  await repository.save(connection);

  const nonce = createGoogleOAuthNonce();
  const state = signGoogleOAuthState({
    connectionId: connection.id,
    workspaceId: connection.workspaceId,
    nonce,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  const url = createGoogleOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_OAUTH_SCOPES],
    state,
    include_granted_scopes: true,
  });
  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_OAUTH_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/api/connections/google/callback",
  });
  return response;
}
