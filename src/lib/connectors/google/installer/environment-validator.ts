/**
 * ============================================
 * CLARA OS
 * Google Environment Validator
 * --------------------------------------------
 * File : environment-validator.ts
 * Responsibility :
 * Validates that the Google connector
 * environment is correctly configured.
 * ============================================
 */

export class EnvironmentValidator {

  /**
   * Validates the required environment variables.
   */
  public async validate(): Promise<void> {

    const required = [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_REDIRECT_URI",
    ];

    const missing = required.filter(
      (key) => !process.env[key],
    );

    if (missing.length > 0) {

      throw new Error(
        `Missing environment variables: ${missing.join(", ")}`,
      );

    }

  }

}