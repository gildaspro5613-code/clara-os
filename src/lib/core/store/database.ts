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

if (!databaseUrl?.trim()) {
  throw new Error(
    "Database: DATABASE_URL is not configured.",
  );
}

/**
 * Neon PostgreSQL SQL client.
 */
export const sql = neon(databaseUrl);
