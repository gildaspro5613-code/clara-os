import { NextResponse } from "next/server";
import { ConnectionStatus } from "@/lib/connections/connection";
import {
  createPendingGoogleConnection,
  DatabaseConnectionRepository,
} from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { OAuthAuthorizationService } from "@/lib/auth/oauth/service";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { googleConfig } from "@/lib/config/google";
import {
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/connectors/google/oauth/google-oauth";
import {
  createGoogleOAuthNonce,
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
  const url = new OAuthAuthorizationService(oauthProviders).create({
    provider: "google", connectionId: connection.id,
    workspaceId: connection.workspaceId, nonce,
    redirectUri: googleConfig.redirectUri,
    redirectPath: "/?google=connected",
    scopes: GOOGLE_OAUTH_SCOPES,
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
