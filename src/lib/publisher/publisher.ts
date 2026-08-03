/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : publisher.ts
 * Responsibility :
 * Defines one Publisher instance.
 * ============================================
 */

import { PublisherContext } from "./publisher-context";

/**
 * Publisher.
 */
export interface Publisher {

  /**
   * Publisher identifier.
   */
  id: string;

  /**
   * Publisher name.
   */
  name: string;

  /**
   * Current context.
   */
  context: PublisherContext;

  /**
   * Is publisher available.
   */
  available: boolean;

  /**
   * Startup date.
   */
  startedAt: Date;

}