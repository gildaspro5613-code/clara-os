/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : runtime-result.ts
 * Responsibility :
 * Defines the result produced by
 * one Clara runtime cycle.
 * ============================================
 */

import { Recommendation } from "@/lib/wisdom/recommendation";
import type { BrainDashboard } from "@/lib/brain/dashboard";

import { RuntimeCycle } from "./runtime-cycle";

/**
 * Runtime result.
 */
export interface RuntimeResult {

  /**
   * Runtime execution status.
   */
  success: boolean;

  /**
   * Human-readable message.
   */
  message: string;

  /**
   * Runtime identifier.
   */
  runtimeId: string;

  /**
   * Runtime event identifier.
   */
  eventId: string;

  /**
   * Runtime lifecycle stages completed.
   */
  cycles: RuntimeCycle[];

  /**
   * Number of experiences recorded
   * during this runtime execution.
   */
  experienceCount: number;

  /**
   * Experience produced by this runtime execution.
   */
  experience?: import("@/lib/experience/experience-record").ExperienceRecord;

  /**
   * Recommendations produced.
   */
  recommendations?: Recommendation[];

  /**
   * Priority assigned to the runtime decision.
   */
  priority?: import("@/lib/wisdom/priority").Priority;

  /**
   * Complete Brain dashboard produced during this runtime.
   */
  brain?: BrainDashboard;

  /**
   * Generated outputs.
   */
  outputs?: unknown[];

  /**
   * Generated document identifier.
   */
  documentId?: string;

  /**
   * Generated document URL.
   */
  documentUrl?: string;

  /**
   * Runtime completion date.
   */
  completedAt: Date;

}
