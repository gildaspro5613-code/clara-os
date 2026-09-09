import { sql } from "@/lib/core/store/database";
import { ensurePersistenceSchema } from "@/lib/persistence/ensure-schema";
import type { JournalRepository } from "./journal-repository";
import type { JournalEntry } from "./journal-entry";

type JournalRow = {
  id: string;
  type: JournalEntry["type"];
  created_at: string | Date;
  summary: string;
  details: string | null;
  recommendation: JournalEntry["recommendation"] | string | null;
};

function parseRecommendation(
  value: JournalRow["recommendation"],
): JournalEntry["recommendation"] | undefined {
  if (!value) return undefined;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as JournalEntry["recommendation"];
  } catch {
    return undefined;
  }
}

function toJournalEntry(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    type: row.type,
    createdAt: new Date(row.created_at),
    summary: row.summary,
    details: row.details ?? undefined,
    recommendation: parseRecommendation(row.recommendation),
  };
}

/**
 * Durable, server-side JournalRepository backed by PostgreSQL/Neon.
 */
export class PostgresJournalRepository implements JournalRepository {
  async append(entry: JournalEntry): Promise<void> {
    await ensurePersistenceSchema();

    const recommendation = entry.recommendation
      ? JSON.stringify(entry.recommendation)
      : null;

    await sql`
      INSERT INTO journal_entries (
        id, type, created_at, summary, details, recommendation
      ) VALUES (
        ${entry.id},
        ${entry.type},
        ${entry.createdAt.toISOString()},
        ${entry.summary},
        ${entry.details ?? null},
        ${recommendation}::jsonb
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  async recent(limit: number): Promise<JournalEntry[]> {
    await ensurePersistenceSchema();

    const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
    const rows = (await sql`
      SELECT id, type, created_at, summary, details, recommendation
      FROM journal_entries
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `) as JournalRow[];

    return rows.map(toJournalEntry);
  }
}
