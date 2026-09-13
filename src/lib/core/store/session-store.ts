/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : session-store.ts
 * Responsibility :
 * Persists Clara's current operational session.
 * Production storage adapter.
 * ============================================
 */

import type { ActorContext } from "../actor-context";
import type { ClaraSession } from "../session";
import { createSession, normalizeSession } from "../session";

import { sql } from "./database";

const LEGACY_SESSION_ID = "default";

function clean(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

/**
 * Builds a deterministic application-owned session key.
 * Provider identities and OAuth tokens never participate in this key.
 */
export function resolveSessionId(actor?: ActorContext): string {
  const userId = clean(actor?.userId);
  const workspaceId = clean(actor?.workspaceId);
  const organizationId = clean(actor?.organizationId);

  if (!userId) return LEGACY_SESSION_ID;

  const scope = workspaceId ?? organizationId ?? "personal";
  return `actor:${encodeURIComponent(scope)}:${encodeURIComponent(userId)}`;
}

export async function saveSession(
  session: ClaraSession,
  actor?: ActorContext,
): Promise<void> {
  const sessionId = resolveSessionId(actor);

  await sql`
    INSERT INTO clara_sessions (
      id,
      data,
      updated_at
    )
    VALUES (
      ${sessionId},
      ${JSON.stringify(session)},
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
  `;
}

export async function loadSession(
  actor?: ActorContext,
): Promise<ClaraSession> {
  const sessionId = resolveSessionId(actor);

  const rows = await sql`
    SELECT data
    FROM clara_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `;

  const sessionRows = rows as Array<{ data: ClaraSession }>;

  if (!sessionRows.length) {
    const session = createSession();
    if (actor?.userId) {
      session.user = {
        ...session.user,
        userId: actor.userId,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
      };
    }
    return session;
  }

  const parsed = normalizeSession(
    sessionRows[0].data as ClaraSession,
  );

  return {
    ...parsed,
    startedAt: new Date(parsed.startedAt),
    updatedAt: new Date(parsed.updatedAt),
  };
}
