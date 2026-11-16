import { nativeOperationFence } from "@/lib/native/authority";
import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { toPublicBrevoConnection } from "@/lib/connections/brevo-connection-public";
import { brevoReadOAuthStatus } from "@/lib/connectors/brevo/read-oauth-status";

export const dynamic = "force-dynamic";

/** Brevo connection metadata stays behind the existing uncertified connector
 * fence. An API key's presence is not a grant or a certified native connector.
 * No credentials or provider data are returned from this route. */
export async function GET(request: Request) {
  const denied = await nativeOperationFence(request);
  if (denied) return denied;
  const connection = await new DatabaseConnectionRepository()
    .findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "brevo");
  return NextResponse.json({
    ...toPublicBrevoConnection(connection),
    apiKeyConfigured: Boolean(process.env.BREVO_API_KEY?.trim()),
    oauthReady: brevoReadOAuthStatus().ready,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
