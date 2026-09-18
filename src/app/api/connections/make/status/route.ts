import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" }; const FORBIDDEN_SCENARIO_KEYS = new Set(["__proto__", "prototype", "constructor"]);
function validScenarioKey(value: string): boolean { return /^[a-zA-Z0-9._:-]{1,120}$/.test(value) && !FORBIDDEN_SCENARIO_KEYS.has(value.toLowerCase()); }
/** Returns non-sensitive Make metadata only. Credentials and webhook URLs remain server-side. */
export async function GET() {
  try {
    const repository = new DatabaseConnectionRepository(); const connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "make");
    if (!connection) return NextResponse.json({ provider: "make", connected: false, status: "NOT_CONFIGURED", scenarioKeys: [] }, { headers: PRIVATE_HEADERS });
    if (connection.scopes.length > 256 || connection.scopes.some((scope) => typeof scope !== "string" || !scope.trim() || scope.length > 256) || new Set(connection.scopes).size !== connection.scopes.length) return NextResponse.json({ provider: "make", connected: false, status: "RECONNECT_REQUIRED", scenarioKeys: [] }, { headers: PRIVATE_HEADERS });
    const rawScenarioKeys = connection.scopes.filter((scope) => scope.startsWith("make:scenario:")).map((scope) => scope.slice("make:scenario:".length));
    if (rawScenarioKeys.some((key) => !validScenarioKey(key))) return NextResponse.json({ provider: "make", connected: false, status: "RECONNECT_REQUIRED", scenarioKeys: [] }, { headers: PRIVATE_HEADERS });
    const scenarioKeys = [...rawScenarioKeys].sort();
    return NextResponse.json({ provider: "make", connected: connection.status === "ACTIVE", status: connection.status, scenarioKeys, updatedAt: connection.updatedAt.toISOString() }, { headers: PRIVATE_HEADERS });
  } catch { return NextResponse.json({ provider: "make", connected: false, status: "UNAVAILABLE", scenarioKeys: [] }, { status: 503, headers: PRIVATE_HEADERS }); }
}
