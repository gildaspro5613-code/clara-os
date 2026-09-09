import { sql } from "@/lib/core/store/database";

let schemaReady: Promise<void> | null = null;

async function initializeSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      context TEXT,
      status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'blocked', 'completed', 'cancelled')),
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      created_at TIMESTAMPTZ NOT NULL,
      due_date TIMESTAMPTZ,
      tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      next_action TEXT,
      last_action TEXT,
      result TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS missions_status_idx ON missions (status)`;
  await sql`CREATE INDEX IF NOT EXISTS missions_updated_at_idx ON missions (updated_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('SYSTEM', 'COGNITIVE', 'ACTION', 'LEARNING')),
      created_at TIMESTAMPTZ NOT NULL,
      summary TEXT NOT NULL,
      details TEXT,
      recommendation JSONB
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS journal_entries_created_at_idx
    ON journal_entries (created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS journal_entries_type_created_at_idx
    ON journal_entries (type, created_at DESC)
  `;
}

/**
 * Lazily provisions Persistence V1 on the connected PostgreSQL branch.
 * Failed initialization is retryable on the next request.
 */
export async function ensurePersistenceSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initializeSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}
