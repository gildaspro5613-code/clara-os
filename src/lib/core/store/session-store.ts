/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : session-store.ts
 * Responsibility :
 * Persists Clara's current operational session.
 * Development storage adapter.
 * ============================================
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import type { ClaraSession } from "../session";
import { createSession } from "../session";

const SESSION_FILE = join(process.cwd(), ".clara", "session.json");

function ensureDirectory(): void {
  mkdirSync(dirname(SESSION_FILE), { recursive: true });
}

export function saveSession(session: ClaraSession): void {
  ensureDirectory();

  writeFileSync(
    SESSION_FILE,
    JSON.stringify(session, null, 2),
    "utf8",
  );
}

export function loadSession(): ClaraSession {
  try {
    const raw = readFileSync(SESSION_FILE, "utf8");
    const parsed = JSON.parse(raw) as ClaraSession;

    return {
      ...parsed,
      startedAt: new Date(parsed.startedAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    return createSession();
  }
}
