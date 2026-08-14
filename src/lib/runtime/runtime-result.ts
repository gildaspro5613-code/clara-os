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
   * Recommendations produced.
   */
  recommendations?: Recommendation[];

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