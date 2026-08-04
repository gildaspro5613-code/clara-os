/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : pricing.ts
 * Responsibility :
 * Defines pricing information
 * for one commercial offer.
 * ============================================
 */

/**
 * Offer pricing.
 */
export interface Pricing {

  /**
   * Monthly subscription.
   */
  monthly: number;

  /**
   * One-time setup fee.
   */
  setup: number;

  /**
   * Currency.
   */
  currency: string;

  /**
   * VAT rate.
   */
  vatRate: number;

}