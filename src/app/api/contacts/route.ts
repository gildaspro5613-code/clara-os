import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { ConnectionStatus } from "@/lib/connections/connection";
import { BrevoConnectorAdapter, BREVO_CAPABILITIES } from "@/lib/connectors/brevo";

export const dynamic = "force-dynamic";

async function adapter() {
  const repository = new DatabaseConnectionRepository();
  const connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "brevo");
  if (!connection || connection.status !== ConnectionStatus.ACTIVE) return null;
  return {
    connection,
    adapter: new BrevoConnectorAdapter(new ConnectionResolver(repository, new CredentialStore())),
  };
}

export async function GET(request: Request) {
  const resolved = await adapter();
  if (!resolved) return NextResponse.json({ connected: false, contacts: [] });
  const url = new URL(request.url);
  const identifier = url.searchParams.get("q")?.trim() || undefined;
  const result = await resolved.adapter.execute(resolved.connection.id, {
    capability: BREVO_CAPABILITIES.CONTACT_SEARCH,
    input: { identifier, limit: identifier ? undefined : 50, offset: 0, sort: "desc" },
  });
  if (!result.success) return NextResponse.json({ connected: true, contacts: [], error: result.error?.message }, { status: 502 });
  return NextResponse.json({ connected: true, ...(result.data as object) });
}
