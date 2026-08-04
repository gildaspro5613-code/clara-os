/**
 * ============================================
 * CLARA OS
 * Onboarding Module
 * --------------------------------------------
 * File : installation.ts
 * Responsibility :
 * Defines one Clara installation.
 * ============================================
 */

import { Offer } from "@/business";

/**
 * Installation.
 */
export interface Installation {

  /**
   * Installation identifier.
   */
  id: string;

  /**
   * Customer company.
   */
  companyName: string;

  /**
   * Selected offer.
   */
  offer: Offer;

  /**
   * Installation date.
   */
  createdAt: Date;

}