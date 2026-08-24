/**
 * ============================================
 * CLARA OS
 * Core Workspace Store
 * --------------------------------------------
 * Persists Clara's workspace configuration.
 * Production storage adapter.
 * ============================================
 */

import type { ClaraWorkspace } from "./workspace";

import { sql } from "@/lib/core/store/database";

const WORKSPACE_ID = "default";

/**
 * Persists Clara's workspace configuration.
 */
export async function saveWorkspace(
  workspace: ClaraWorkspace,
): Promise<void> {

  await sql`
    INSERT INTO clara_workspace (
      id,
      data,
      updated_at
    )
    VALUES (
      ${WORKSPACE_ID},
      ${JSON.stringify(workspace)},
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
  `;

}

/**
 * Loads Clara's persisted workspace configuration.
 */
export async function loadWorkspace():
  Promise<ClaraWorkspace | null> {

  const rows = await sql`
    SELECT data
    FROM clara_workspace
    WHERE id = ${WORKSPACE_ID}
    LIMIT 1
  `;

  const workspaceRows =
    rows as Array<{ data: ClaraWorkspace }>;

  if (!workspaceRows.length) {
    return null;
  }

  return workspaceRows[0].data;

}
