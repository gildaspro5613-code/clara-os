/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : company.ts
 * Responsibility :
 * Defines Clara company's identity.
 * ============================================
 */

/**
 * Company information.
 */
export interface Company {

  /**
   * Company name.
   */
  name: string;

  /**
   * Website.
   */
  website: string;

  /**
   * Contact email.
   */
  email: string;

  /**
   * Contact phone.
   */
  phone: string;

  /**
   * Company mission.
   */
  mission: string;

  /**
   * Company vision.
   */
  vision: string;

}