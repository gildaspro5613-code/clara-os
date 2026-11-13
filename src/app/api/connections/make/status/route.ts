import { withNativeScope, nativeContext } from "@/lib/native/scoped-context";
import { nativeFailure } from "@/lib/native/authority";
import { RegistryError } from "@/lib/canonical/registry";
import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
const FORBIDDEN_SCENARIO_KEYS = new Set(["__proto__", "prototype", "constructor"]);
function validScenarioKey(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,120}$/.test(value) &&
    !FORBIDDEN_SCENARIO_KEYS.has(value.toLowerCase());
}

/** Scoped, non-sensitive metadata only. No provider call, no credential read,
 * no scenario execution, and never a claim of certified Make connectivity.
 * Other legacy Make configure/verify/execute routes retain their fences.
 */
export async function GET(request: Request) {
  try {
    return await withNativeScope(request, false, async () => {
      const context = nativeContext();
      if (!context || context.scope.workspaceId !== CURRENT_WORKSPACE_ID)
        throw new RegistryError(403, "MAKE_WORKSPACE_DENIED");
      try {
        const repository = new DatabaseConnectionRepository();
        const connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "make");
        if (!connection)
          return NextResponse.json({
            provider: "make", connected: false, status: "NOT_CONFIGURED",
            scenarioKeys: [], validation: "METADATA_ONLY",
          }, { headers: PRIVATE_HEADERS });
        if (!Array.isArray(connection.scopes) || connection.scopes.length > 256 ||
            connection.scopes.some((scope) => typeof scope !== "string" ||
              !scope.trim() || scope.length > 256) ||
            new Set(connection.scopes).size !== connection.scopes.length)
          return NextResponse.json({
            provider: "make", connected: false, status: "RECONNECT_REQUIRED",
            scenarioKeys: [], validation: "METADATA_ONLY",
          }, { headers: PRIVATE_HEADERS });
        const keys = connection.scopes
          .filter((scope) => scope.startsWith("make:scenario:"))
          .map((scope) => scope.slice("make:scenario:".length));
        if (keys.some((key) => !validScenarioKey(key)))
          return NextResponse.json({
            provider: "make", connected: false, status: "RECONNECT_REQUIRED",
            scenarioKeys: [], validation: "METADATA_ONLY",
          }, { headers: PRIVATE_HEADERS });
        return NextResponse.json({
          provider: "make",
          // Even an ACTIVE database row does not establish provider authority.
          connected: false,
          status: connection.status,
          scenarioKeys: [...keys].sort(),
          updatedAt: connection.updatedAt.toISOString(),
          validation: "METADATA_ONLY",
        }, { headers: PRIVATE_HEADERS });
      } catch {
        return NextResponse.json({
          provider: "make", connected: false, status: "UNAVAILABLE",
          scenarioKeys: [], validation: "METADATA_ONLY",
        }, { status: 503, headers: PRIVATE_HEADERS });
      }
    });
  } catch (error) { return nativeFailure(error); }
}
