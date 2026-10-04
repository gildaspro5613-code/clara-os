import { sql } from "./database";
import type { JournalEntry } from "../journal-entry";

let schemaReady: Promise<void> | null = null;

async function ensureJournalTable(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS clara_journal_entries (
          id TEXT PRIMARY KEY,
          entry JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}

export async function loadJournalEntries(): Promise<JournalEntry[]> {
  await ensureJournalTable();

  const rows = await sql`
    SELECT entry
    FROM clara_journal_entries
    ORDER BY created_at ASC
  `;

  return (rows as Array<{ entry: JournalEntry }>).map(({ entry }) => ({
    ...entry,
    createdAt: new Date(entry.createdAt),
  }));
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  await ensureJournalTable();

  await sql`
    INSERT INTO clara_journal_entries (id, entry, created_at)
    VALUES (${entry.id}, ${JSON.stringify(entry)}, ${entry.createdAt})
    ON CONFLICT (id)
    DO UPDATE SET
      entry = EXCLUDED.entry,
      created_at = EXCLUDED.created_at
  `;
}

export async function clearJournalEntries(): Promise<void> {
  await ensureJournalTable();
  await sql`DELETE FROM clara_journal_entries`;
}
