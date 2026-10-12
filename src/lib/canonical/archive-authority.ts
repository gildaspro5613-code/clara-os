import { randomBytes } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import { challengeDigest, databaseError, opaque, RegistryError, type RegistryContext, type RegistryQuery } from "./registry";
import type { LiveArchiveReference } from "@/lib/documents/live-archive-reference";
export interface CanonicalScope {
  osUserId: string; workspaceId: string; clientId: string; projectId: string;
  clientName: string; projectName: string; liveUserId: string; liveProjectId: string;
  identityProofId: string; projectProofId: string; canArchive?: boolean; operation: "read" | "archive";
}
export function createCanonicalArchiveAuthority(query: RegistryQuery = sql) {
  async function result(promise: Promise<unknown[]>): Promise<unknown> {
    try {
      const rows = await promise, value = (rows[0] as {result?: unknown})?.result;
      if (value === undefined) throw new RegistryError(503, "CANONICAL_AUTHORITY_UNAVAILABLE");
      return value;
    } catch (error) { databaseError(error); }
  }
  async function issue(context: RegistryContext, client: string, project: string, operation: "read" | "archive") {
    const ticket = randomBytes(32).toString("base64url");
    const scope = await result(query`SELECT clara_registry_ticket(${context.digest},${context.workspaceId},${opaque(client)},${opaque(project)},${operation},${challengeDigest(ticket)}) AS result`) as CanonicalScope;
    return { scope, ticket };
  }
  async function redeem(workspace: string, ticket: unknown) {
    return result(query`SELECT clara_registry_redeem(${opaque(workspace)},${challengeDigest(ticket)}) AS result`);
  }
  async function current(context: RegistryContext, client: string, project: string, operation: "read" | "archive") {
    return result(query`SELECT clara_registry_authority(${context.digest},${context.workspaceId},${opaque(client)},${opaque(project)},${operation}) AS result`) as Promise<CanonicalScope>;
  }
  async function commit(context: RegistryContext, ticket: string, record: LiveArchiveReference) {
    return result(query`SELECT clara_registry_archive_commit(${context.digest},${context.workspaceId},${challengeDigest(ticket)},${JSON.stringify(record)}::jsonb) AS result`);
  }
  async function settle(workspace: string, ticket: unknown, revision: unknown, liveProject: unknown, mode: "commit" | "cancel") {
    if (!Number.isSafeInteger(revision) || (revision as number) < 1) throw new RegistryError(400,"INVALID_LIFECYCLE_REVISION");
    return result(query`SELECT clara_registry_archive_settle(${opaque(workspace)},${challengeDigest(ticket)},${revision}::bigint,${opaque(liveProject)},${mode}) AS result`);
  }
  async function cancelDigest(workspace: string, digest: unknown, revision: unknown, liveProject: unknown) {
    if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest) || !Number.isSafeInteger(revision) || (revision as number)<1)
      throw new RegistryError(400,"INVALID_ARCHIVE_RECONCILIATION");
    return result(query`SELECT clara_registry_archive_settle(${opaque(workspace)},${digest},${revision}::bigint,${opaque(liveProject)},${"cancel"}) AS result`);
  }
  async function history(context: RegistryContext, client: string, project: string) {
    await current(context,client,project,"read");
    try {
      const rows = await query`SELECT archive_record FROM clara_live_archive_references WHERE workspace_id=${context.workspaceId} AND client_id=${client} AND project_id=${project} LIMIT 1`;
      return (rows[0] as {archive_record?: LiveArchiveReference} | undefined)?.archive_record ?? null;
    } catch (error) { databaseError(error); }
  }
  return { issue, redeem, current, commit, settle, cancelDigest, history };
}
export const canonicalArchiveAuthority = createCanonicalArchiveAuthority();
