import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import { CLARA_AUTH_COOKIE, sessionTokenDigest } from "@/lib/auth/authenticated-workspace-session";

export type RegistryQuery = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
export interface RegistryContext { digest: string; workspaceId: string }
export class RegistryError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

export function opaque(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 160 || value !== value.trim()
      || /[\x00-\x20\x7f/\\]/.test(value) || value === "default") throw new RegistryError(400, "INVALID_REGISTRY_IDENTIFIER");
  return value;
}
export function name(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 160 || /[\x00-\x1f\x7f]/.test(value))
    throw new RegistryError(400, "INVALID_REGISTRY_NAME");
  return value.trim();
}
export function challengeDigest(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new RegistryError(400, "INVALID_LINK_CHALLENGE");
  return createHash("sha256").update(value).digest("hex");
}
export function registryContext(cookie: string | null, workspace: unknown): RegistryContext {
  const matches = (cookie ?? "").split(";").map(x => x.trim()).filter(x => x.startsWith(`${CLARA_AUTH_COOKIE}=`));
  const digest = matches.length === 1 ? sessionTokenDigest(matches[0].slice(CLARA_AUTH_COOKIE.length + 1)) : null;
  if (!digest) throw new RegistryError(401, "AUTHENTICATED_OS_SESSION_REQUIRED");
  return { digest, workspaceId: opaque(workspace) };
}

export function databaseError(error: unknown): never {
  if (error instanceof RegistryError) throw error;
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "42501") throw new RegistryError(403, "REGISTRY_ACCESS_DENIED");
  if (code === "23505") throw new RegistryError(409, "REGISTRY_CONFLICT");
  if (code.startsWith("22") || code === "23514" || code === "23502") throw new RegistryError(400, "INVALID_REGISTRY_REQUEST");
  throw new RegistryError(503, "REGISTRY_UNAVAILABLE");
}

export interface LiveLinkProof {
  schemaVersion: "clara.canonical-link-proof.v1";
  proofId: string;
  challengeHash: string;
  kind: "identity" | "project";
  liveUserId: string;
  liveProjectId: string | null;
  createdAt: string;
  expiresAt: string;
}
export interface LinkCandidate {
  id: string; kind: "identity" | "project"; tokenHash: string;
  proofId: string | null; liveUserId: string | null; liveProjectId: string | null; consumed: boolean;
}

/** SQL functions are provisioned by migration 008, never by runtime startup.
 * Every mutation and its audit record commit atomically in PostgreSQL.
 */
export function createCanonicalRegistry(query: RegistryQuery = sql) {
  async function command(context: RegistryContext, operation: string, payload: Record<string, unknown>) {
    try {
      const rows = await query`SELECT clara_registry_command(${context.digest},${context.workspaceId},${operation},${JSON.stringify(payload)}::jsonb) AS result`;
      const result = (rows[0] as { result?: unknown } | undefined)?.result;
      if (result === undefined) throw new RegistryError(503, "REGISTRY_UNAVAILABLE");
      return result;
    } catch (error) { databaseError(error); }
  }
  async function begin(context: RegistryContext, kind: "identity" | "project", selectors: Record<string, unknown>) {
    const token = randomBytes(32).toString("base64url");
    const result = await command(context, kind === "identity" ? "beginIdentityLink" : "beginProjectLink",
      { ...selectors, id: randomUUID(), tokenHash: challengeDigest(token) });
    return { ...(result as object), challenge: token };
  }
  async function candidate(context: RegistryContext, challengeId: string): Promise<LinkCandidate> {
    return await command(context, "challenge", { challengeId: opaque(challengeId) }) as LinkCandidate;
  }
  async function confirm(context: RegistryContext, challengeId: string, fetchProof: (candidate: LinkCandidate) => Promise<LiveLinkProof>) {
    const current = await candidate(context, challengeId);
    if (!current.proofId) throw new RegistryError(409, "LIVE_CONSENT_REQUIRED");
    // Fetch a fresh proof on the configured server-to-server bridge. No browser
    // proof, product assertion or pending proposal can bypass this step.
    const proof = await fetchProof(current);
    if (proof.schemaVersion !== "clara.canonical-link-proof.v1"
      || proof.proofId !== current.proofId || proof.challengeHash !== current.tokenHash
      || proof.kind !== current.kind || proof.liveUserId !== current.liveUserId
      || proof.liveProjectId !== current.liveProjectId) throw new RegistryError(403, "LIVE_PROOF_MISMATCH");
    const created = Date.parse(proof.createdAt), expires = Date.parse(proof.expiresAt), now = Date.now();
    if (!Number.isFinite(created) || !Number.isFinite(expires) || created > now + 5_000
      || expires <= now || expires <= created || expires - created > 300_000) throw new RegistryError(403, "LIVE_PROOF_EXPIRED");
    return command(context, "confirmLink", { ...proof, challengeId });
  }
  async function pending(workspaceId: string, operation: "inspect" | "propose", challenge: string, payload: Record<string, unknown>) {
    try {
      const rows = await query`SELECT clara_registry_pending(${opaque(workspaceId)},${challengeDigest(challenge)},${operation},${JSON.stringify(payload)}::jsonb) AS result`;
      const result = (rows[0] as { result?: unknown } | undefined)?.result;
      if (result === undefined) throw new RegistryError(503, "REGISTRY_UNAVAILABLE");
      return result;
    } catch (error) { databaseError(error); }
  }
  async function workspaces(digest: string) {
    try {
      return await query`SELECT m.workspace_id FROM clara_auth_sessions s JOIN clara_workspace_memberships m ON m.user_id=s.user_id WHERE s.token_hash=${digest} AND s.revoked_at IS NULL AND s.expires_at>NOW() AND m.revoked_at IS NULL AND EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=s.user_id) ORDER BY m.workspace_id LIMIT 100`;
    } catch (error) { databaseError(error); }
  }
  return { command, begin, candidate, confirm, pending, workspaces };
}

export const canonicalRegistry = createCanonicalRegistry();
