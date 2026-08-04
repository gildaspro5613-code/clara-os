/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : branding.ts
 * Responsibility :
 * Defines Clara visual identity.
 * ============================================
 */

/**
 * Business branding.
 */
export interface Branding {

  /**
   * Company name.
   */
  companyName: string;

  /**
   * Primary color.
   */
  primaryColor: string;

  /**
   * Secondary color.
   */
  secondaryColor: string;

  /**
   * Logo path or URL.
   */
  logo: string;

  /**
   * Commercial slogan.
   */
  slogan: string;

}