/**
 * Clara durable session store.
 *
 * The legacy OS surface keeps the historical "default" key. External products
 * must provide an opaque, context-derived key so users/workspaces/sessions
 * never collapse into the owner session.
 */
import type { ClaraSession } from "../session";
import { createSession, normalizeSession } from "../session";
import { sql } from "./database";

export const DEFAULT_SESSION_KEY = "default";

function normalizeKey(sessionKey?: string): string {
  const key = sessionKey?.trim() || DEFAULT_SESSION_KEY;
  if (!key || key.length > 512 || /[\\/\0]/.test(key)) {
    throw new Error("Invalid Clara session key.");
  }
  return key;
}

export async function saveSession(
  session: ClaraSession,
  sessionKey: string = DEFAULT_SESSION_KEY,
): Promise<void> {
  const key = normalizeKey(sessionKey);
  await sql`
    INSERT INTO clara_sessions (id, data, updated_at)
    VALUES (${key}, ${JSON.stringify(session)}, NOW())
    ON CONFLICT (id)
    DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
}

export async function loadSession(
  sessionKey: string = DEFAULT_SESSION_KEY,
): Promise<ClaraSession> {
  const key = normalizeKey(sessionKey);
  const rows = await sql`
    SELECT data FROM clara_sessions WHERE id = ${key} LIMIT 1
  `;
  const sessionRows = rows as Array<{ data: ClaraSession }>;
  if (!sessionRows.length) return createSession();
  const parsed = normalizeSession(sessionRows[0].data as ClaraSession);
  return {
    ...parsed,
    startedAt: new Date(parsed.startedAt),
    updatedAt: new Date(parsed.updatedAt),
  };
}
