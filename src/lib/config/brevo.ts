/**
 * ============================================
 * CLARA OS
 * Brevo Configuration
 * --------------------------------------------
 * File : brevo.ts
 * Responsibility :
 * Centralizes Brevo configuration.
 * ============================================
 */

/**
 * Brevo configuration.
 */
export const brevoConfig = {

  /**
   * Brevo API key.
   */
  apiKey:
    process.env.BREVO_API_KEY ?? "",

  /**
   * Default sender email address for transactional emails.
   */
  senderEmail:
    process.env.BREVO_SENDER_EMAIL ?? "",

  /**
   * Default sender name for transactional emails.
   */
  senderName:
    process.env.BREVO_SENDER_NAME ?? "Clara",

} as const;
