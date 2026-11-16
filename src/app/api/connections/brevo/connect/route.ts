import { nativeOperationFence } from "@/lib/native/authority";
import { NextResponse } from "next/server";
import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { OAuthAuthorizationService } from "@/lib/auth/oauth/service";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { createBrevoOAuthNonce } from "@/lib/connectors/brevo/oauth-state";
import {brevoReadOAuthStatus} from "@/lib/connectors/brevo/read-oauth-status";

export const dynamic = "force-dynamic";
const BREVO_OAUTH_COOKIE = "clara_brevo_oauth_nonce";

function pendingConnection(workspaceId: string, scopes: string[]): Connection {
  const now = new Date();
  return {
    id: crypto.randomUUID(), workspaceId, provider: "brevo",
    status: ConnectionStatus.PENDING_AUTHENTICATION,
    scopes, createdAt: now, updatedAt: now,
  };
}

export async function GET(request: Request) {
  const denied = await nativeOperationFence(request);
  if (denied) return denied;
  const config = brevoReadOAuthStatus();
  if (!config.ready) return NextResponse.json({ error: "BREVO_READ_OAUTH_CONFIGURATION_REQUIRED" }, { status: 503 });
  const redirectUri = process.env.BREVO_REDIRECT_URI!;

  const repository = new DatabaseConnectionRepository();
  const scopes = config.scopes;
  let connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "brevo");
  connection = connection ? {
    ...connection,
    status: connection.status === ConnectionStatus.ACTIVE ? ConnectionStatus.ACTIVE : ConnectionStatus.PENDING_AUTHENTICATION,
    scopes: connection.status === ConnectionStatus.ACTIVE ? connection.scopes : scopes, updatedAt: new Date(),
  } : pendingConnection(CURRENT_WORKSPACE_ID, scopes);
  await repository.save(connection);

  const nonce = createBrevoOAuthNonce();
  const url = new OAuthAuthorizationService(oauthProviders).create({
    provider: "brevo", connectionId: connection.id, workspaceId: connection.workspaceId,
    nonce, redirectUri, redirectPath: "/?brevo=connected", scopes,
  });
  const response = NextResponse.redirect(url);
  response.cookies.set(BREVO_OAUTH_COOKIE, nonce, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60, path: "/api/connections/brevo/callback",
  });
  return response;
}
