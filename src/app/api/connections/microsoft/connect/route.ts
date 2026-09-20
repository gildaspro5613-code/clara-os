import { NextResponse } from "next/server";
import { ConnectionStatus } from "@/lib/connections/connection";
import {
  createPendingConnection,
  DatabaseConnectionRepository,
} from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { OAuthAuthorizationService } from "@/lib/auth/oauth/service";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { createOAuthNonce } from "@/lib/auth/oauth/state";
import { microsoftConfig } from "@/lib/config/microsoft";
import { MICROSOFT_OAUTH_SCOPES } from "@/lib/connectors/microsoft/oauth/microsoft-oauth";

export const dynamic = "force-dynamic";
const MICROSOFT_OAUTH_COOKIE = "clara_microsoft_oauth_nonce";

export async function GET() {
  const repository = new DatabaseConnectionRepository();
  let connection = await repository.findByWorkspaceAndProvider(
    CURRENT_WORKSPACE_ID,
    "microsoft",
  );

  if (!connection) {
    connection = createPendingConnection(
      CURRENT_WORKSPACE_ID,
      "microsoft",
      [...MICROSOFT_OAUTH_SCOPES],
    );
  } else {
    connection = {
      ...connection,
      status: connection.status === ConnectionStatus.ACTIVE
        ? ConnectionStatus.ACTIVE
        : ConnectionStatus.PENDING_AUTHENTICATION,
      scopes: [...MICROSOFT_OAUTH_SCOPES],
      updatedAt: new Date(),
    };
  }

  await repository.save(connection);

  const nonce = createOAuthNonce();
  const url = new OAuthAuthorizationService(oauthProviders).create({
    provider: "microsoft",
    connectionId: connection.id,
    workspaceId: connection.workspaceId,
    nonce,
    redirectUri: microsoftConfig.redirectUri,
    redirectPath: "/?microsoft=connected",
    scopes: MICROSOFT_OAUTH_SCOPES,
    parameters: { prompt: "select_account" },
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(MICROSOFT_OAUTH_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/api/connections/microsoft/callback",
  });
  return response;
}
