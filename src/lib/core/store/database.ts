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
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl?.trim()) {
    throw new Error(
      "Database: DATABASE_URL is not configured.",
    );
  }

  return neon(databaseUrl);
}

/**
 * Lazy Neon PostgreSQL SQL client.
 * Keeps the tagged-template API used by Clara OS.
 */
export const sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => {
  return (getDatabase() as any)(strings, ...values);
};
