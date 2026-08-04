/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : offer.ts
 * Responsibility :
 * Defines one Clara commercial offer.
 * ============================================
 */

import { Application } from "./application";

/**
 * One Clara commercial offer.
 */
export interface Offer {

  /**
   * Unique offer identifier.
   */
  id: string;

  /**
   * Public offer name.
   */
  name: string;

  /**
   * Short description.
   */
  description: string;

  /**
   * Included applications.
   */
  applications: Application[];

  /**
   * Is offer active.
   */
  active: boolean;

}