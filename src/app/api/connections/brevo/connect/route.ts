import { NextResponse } from "next/server";
import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { OAuthAuthorizationService } from "@/lib/auth/oauth/service";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { createBrevoOAuthNonce } from "@/lib/connectors/brevo/oauth-state";

export const dynamic = "force-dynamic";
const BREVO_OAUTH_COOKIE = "clara_brevo_oauth_nonce";

function configuredScopes(): string[] {
  return (process.env.BREVO_OAUTH_SCOPES ?? "").split(/[ ,]+/).filter(Boolean);
}

function pendingConnection(workspaceId: string, scopes: string[]): Connection {
  const now = new Date();
  return {
    id: crypto.randomUUID(), workspaceId, provider: "brevo",
    status: ConnectionStatus.PENDING_AUTHENTICATION,
    scopes, createdAt: now, updatedAt: now,
  };
}

export async function GET(request: Request) {
  const redirectUri = process.env.BREVO_REDIRECT_URI;
  if (!redirectUri) return NextResponse.json({ error: "BREVO_REDIRECT_URI is not configured." }, { status: 503 });

  const repository = new DatabaseConnectionRepository();
  const scopes = configuredScopes();
  let connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "brevo");
  connection = connection ? {
    ...connection,
    status: connection.status === ConnectionStatus.ACTIVE ? ConnectionStatus.ACTIVE : ConnectionStatus.PENDING_AUTHENTICATION,
    scopes, updatedAt: new Date(),
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
