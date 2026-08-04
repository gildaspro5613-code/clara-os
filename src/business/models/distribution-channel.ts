/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : distribution-channel.ts
 * Responsibility :
 * Defines one sales channel.
 * ============================================
 */

/**
 * Distribution channel.
 */
export interface DistributionChannel {

  /**
   * Channel identifier.
   */
  id: string;

  /**
   * Channel name.
   */
  name: string;

  /**
   * Is channel active.
   */
  enabled: boolean;

}