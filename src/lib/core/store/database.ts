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
import { recetteDatabase, recetteRequested } from "@/lib/recette/policy";

function getDatabase() {
  if (recetteRequested()) recetteDatabase();
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL;

  if (!databaseUrl?.trim()) {
    throw new Error(
      "Database: DATABASE_URL or POSTGRES_URL is not configured.",
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
  // Preserve the existing adapter's polymorphic row contract; callers validate domain rows.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getDatabase() as any)(strings, ...values);
};
