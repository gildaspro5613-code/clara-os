/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : orchestrator.ts
 * Responsibility :
 * Coordinates one complete execution cycle
 * between the Core and the Brain.
 * ============================================
 */

import { Event } from "@/types";

import { runBrain } from "@/lib/brain";

import {
  ClaraSession,
} from "./session";

/**
 * Executes one complete Clara reasoning cycle.
 */
export async function orchestrate(
  session: ClaraSession,
  event: Event,
): Promise<ClaraSession> {

  /*
   * Execute one Brain cycle.
   */
  const recommendation = await runBrain(
    event,
  );

  /*
   * Update the current session.
   */
  session.recommendation = recommendation;
  session.updatedAt = new Date();

  return session;

}