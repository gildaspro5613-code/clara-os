/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : runtime.ts
 * Responsibility :
 * Owns the unique Clara runtime instance.
 * ============================================
 */

import { Clara } from "./clara";
import { ClaraSession } from "./session";

const clara = new Clara();

/**
 * Starts the Clara runtime.
 */
export async function startRuntime(): Promise<ClaraSession> {
  return await clara.start();
}

/**
 * Stops the Clara runtime.
 */
export async function stopRuntime(): Promise<void> {
  await clara.stop();
}

/**
 * Returns the current Clara session.
 */
export function getSession(): ClaraSession {
  return clara.getSession();
}

/**
 * Returns the Clara runtime instance.
 */
export function getRuntime(): Clara {
  return clara;
}