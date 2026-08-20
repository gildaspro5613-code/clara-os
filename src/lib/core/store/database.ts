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

const databaseUrl = process.env.DATABASE_URL;

/**
 * Neon PostgreSQL SQL client.
 *
 * The client is created lazily when the
 * database is actually used.
 */
export function getDatabase() {
  if (!databaseUrl?.trim()) {
    throw new Error(
      "Database: DATABASE_URL is not configured.",
    );
  }

  return neon(databaseUrl);
}

export const sql = new Proxy(
  {} as ReturnType<typeof neon>,
  {
    get(_target, property) {
      const client = getDatabase();

      return Reflect.get(
        client as object,
        property,
      );
    },
  },
);
