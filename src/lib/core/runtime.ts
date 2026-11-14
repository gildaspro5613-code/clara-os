import {nativeContext} from "@/lib/native/scoped-context";
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
  return await getRuntime().start();
}

/**
 * Stops the Clara runtime.
 */
export async function stopRuntime(): Promise<void> {
  await getRuntime().stop();
}

/**
 * Returns the current Clara session.
 */
export function getSession(): ClaraSession {
  return getRuntime().getSession();
}

/**
 * Returns the Clara runtime instance.
 */
export function getRuntime(): Clara {
  const native=nativeContext();
  if(native)return native.runtime??(native.runtime=new Clara(native.scope.sessionId,native.scope.workspaceId));
  return clara;
}