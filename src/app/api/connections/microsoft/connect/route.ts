import { NextResponse, type NextRequest } from "next/server";
import { authenticatedMicrosoftWorkspace } from "@/lib/connectors/microsoft/security/authenticated-microsoft-workspace";
import { ConnectionStatus } from "@/lib/connections/connection";
import { createPendingConnection, DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { OAuthAuthorizationService } from "@/lib/auth/oauth/service";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { createOAuthNonce } from "@/lib/auth/oauth/state";
import { microsoftConfig } from "@/lib/config/microsoft";
import { MICROSOFT_OAUTH_SCOPES } from "@/lib/connectors/microsoft/oauth/microsoft-oauth";

export const dynamic = "force-dynamic";
const MICROSOFT_OAUTH_COOKIE = "clara_microsoft_oauth_nonce";

export async function GET(request: NextRequest) {
  const workspace = await authenticatedMicrosoftWorkspace(request.headers.get("cookie"), "connections:manage");
  if (!workspace) return NextResponse.json({ error: "MICROSOFT_WORKSPACE_AUTH_REQUIRED" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!microsoftConfig.clientId || !microsoftConfig.clientSecret || !microsoftConfig.redirectUri) {
    return NextResponse.json({ error: "MICROSOFT_OAUTH_NOT_CONFIGURED" }, { status: 503 });
  }
  const repository = new DatabaseConnectionRepository();
  let connection = await repository.findByWorkspaceAndProvider(workspace.workspaceId, "microsoft");
  connection = connection ? {
    ...connection,
    status: connection.status === ConnectionStatus.ACTIVE ? ConnectionStatus.ACTIVE : ConnectionStatus.PENDING_AUTHENTICATION,
    scopes: [...MICROSOFT_OAUTH_SCOPES], updatedAt: new Date(),
  } : createPendingConnection(workspace.workspaceId, "microsoft", [...MICROSOFT_OAUTH_SCOPES]);
  await repository.save(connection);
  const nonce = createOAuthNonce();
  const url = new OAuthAuthorizationService(oauthProviders).create({
    provider: "microsoft", connectionId: connection.id, workspaceId: workspace.workspaceId,
    nonce, redirectUri: microsoftConfig.redirectUri, redirectPath: "/?microsoft=connected",
    scopes: MICROSOFT_OAUTH_SCOPES, parameters: { prompt: "select_account" },
  });
  const response = NextResponse.redirect(url);
  response.cookies.set(MICROSOFT_OAUTH_COOKIE, nonce, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 600, path: "/api/connections/microsoft/callback",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
