import { query } from "./database";
import type { JournalEntry } from "../journal-entry";

let initialized = false;

async function ensureJournalTable(): Promise<void> {
  if (initialized) return;

  await query(`
    CREATE TABLE IF NOT EXISTS clara_journal_entries (
      id TEXT PRIMARY KEY,
      entry JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  initialized = true;
}

export async function loadJournalEntries(): Promise<JournalEntry[]> {
  await ensureJournalTable();

  const result = await query<{ entry: JournalEntry }>(`
    SELECT entry
    FROM clara_journal_entries
    ORDER BY created_at ASC
  `);

  return result.rows.map(({ entry }) => ({
    ...entry,
    timestamp: new Date(entry.timestamp),
  }));
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  await ensureJournalTable();

  await query(
    `
      INSERT INTO clara_journal_entries (id, entry, created_at)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (id)
      DO UPDATE SET entry = EXCLUDED.entry, created_at = EXCLUDED.created_at
    `,
    [entry.id, JSON.stringify(entry), entry.timestamp],
  );
}

export async function clearJournalEntries(): Promise<void> {
  await ensureJournalTable();
  await query("DELETE FROM clara_journal_entries");
}
