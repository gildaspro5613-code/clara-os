/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector-context.ts
 * Responsibility :
 * Defines the execution context
 * of a connector.
 * ============================================
 */

import { BrainContext } from "@/lib/brain";
import { ExperienceRecord } from "@/lib/experience/experience-record";
import { Recommendation } from "@/lib/wisdom/recommendation";

/**
 * Connector context.
 */
export interface ConnectorContext {

  /**
   * Current reasoning context.
   */
  brain: BrainContext;

  /**
   * Relevant experiences.
   */
  experiences: ExperienceRecord[];

  /**
   * Current recommendations.
   */
  recommendations: Recommendation[];

  /**
   * Connector configuration.
   */
  configuration: Record<string, unknown>;

  /**
   * Context creation date.
   */
  createdAt: Date;

}