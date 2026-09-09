/**
 * ============================================
 * CLARA OS
 * Core Store
 * --------------------------------------------
 * File : database.ts
 * Responsibility :
 * Provides the Neon PostgreSQL client.
 * ============================================
 */

import { neon } from "@neondatabase/serverless";

function getDatabase() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL;

  if (!databaseUrl?.trim()) {
    throw new Error(
      "Database: DATABASE_URL or POSTGRES_URL is not configured.",
    );
  }

  return neon(databaseUrl.trim());
}

/**
 * Lazy Neon PostgreSQL SQL client.
 * Keeps database access server-side and avoids resolving credentials at import time.
 */
export const sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => {
  return (getDatabase() as any)(strings, ...values);
};
