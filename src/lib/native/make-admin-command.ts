import { RegistryError, databaseError, type RegistryQuery } from "@/lib/canonical/registry";
import { nativeContext } from "./scoped-context";

/**
 * Internal-only administrative boundary for Make READ grants.
 * Requires the SQL command to have been separately reviewed and installed.
 * Never accepts caller-provided identity, workspace, client, project or session.
 * This is NOT a public API route and does not provision Make credentials.
 */
export function nativeMakeAdminCommands(query?: RegistryQuery) {
  return async (
    operation: "grant" | "revoke",
    input: { connectionId: string; scenarioKey: string; ownerUserId: string; reason?: string },
  ): Promise<{ operation: string; revision: number; scenarioKey: string }> => {
    const ctx = nativeContext();
    if (!ctx || !ctx.writable) throw new RegistryError(403, "NATIVE_MAKE_ADMIN_SCOPE_REQUIRED");
    if (
      !input ||
      typeof input.connectionId !== "string" ||
      typeof input.scenarioKey !== "string" ||
      typeof input.ownerUserId !== "string" ||
      !input.connectionId ||
      !input.ownerUserId ||
      !/^[a-zA-Z0-9._:-]{1,120}$/.test(input.scenarioKey)
    ) throw new RegistryError(400, "NATIVE_MAKE_ADMIN_INVALID_INPUT");

    const s = ctx.scope;
    try {
      const rows = await (query ?? ctx.query)`
        SELECT clara_native_make_admin_command(
          ${s.digest}, ${s.workspaceId}, ${s.clientId}, ${s.projectId},
          ${s.sessionId}, ${operation},
          ${JSON.stringify(input)}::jsonb
        ) AS data
      `;
      const output = (rows[0] as {data?: unknown} | undefined)?.data;
      if (!output || typeof output !== "object" || Array.isArray(output))
        throw new RegistryError(503, "NATIVE_MAKE_ADMIN_UNAVAILABLE");
      const value = output as Record<string, unknown>;
      if (
        value.operation !== operation ||
        value.scenarioKey !== input.scenarioKey ||
        !Number.isSafeInteger(Number(value.revision)) ||
        Number(value.revision) <= 0
      ) throw new RegistryError(503, "NATIVE_MAKE_ADMIN_UNAVAILABLE");
      return {
        operation,
        scenarioKey: input.scenarioKey,
        revision: Number(value.revision),
      };
    } catch (error) {
      if (error instanceof RegistryError) throw error;
      if ((error as { code?: string })?.code === "40001")
        throw new RegistryError(409, "NATIVE_MAKE_ADMIN_REVISION_CONFLICT");
      databaseError(error);
      throw new RegistryError(503, "NATIVE_MAKE_ADMIN_UNAVAILABLE");
    }
  };
}
