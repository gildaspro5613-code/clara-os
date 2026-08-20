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

import type { ClaraSession } from "../session";
import { createSession } from "../session";

import { sql } from "./database";

const SESSION_ID = "default";

export async function saveSession(
  session: ClaraSession,
): Promise<void> {

  await sql`
    INSERT INTO clara_sessions (
      id,
      data,
      updated_at
    )
    VALUES (
      ${SESSION_ID},
      ${JSON.stringify(session)},
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
  `;

}

export async function loadSession(): Promise<ClaraSession> {

  const rows = await sql`
    SELECT data
    FROM clara_sessions
    WHERE id = ${SESSION_ID}
    LIMIT 1
  `;

  const sessionRows = rows as Array<{ data: ClaraSession }>;

  if (!sessionRows.length) {
    return createSession();
  }

  const parsed =
    sessionRows[0].data as ClaraSession;

  return {
    ...parsed,
    startedAt: new Date(parsed.startedAt),
    updatedAt: new Date(parsed.updatedAt),
  };

}
