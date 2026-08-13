/**
 * ============================================
 * CLARA OS
 * GitHub Configuration
 * --------------------------------------------
 * File : github.ts
 * Responsibility :
 * Centralizes GitHub connector configuration.
 * ============================================
 */

/**
 * GitHub configuration.
 */
export const githubConfig = {

  /**
   * GitHub REST API base URL.
   */
  apiBaseUrl: "https://api.github.com",

  /**
   * GitHub personal access token.
   * Must remain server-side only.
   */
  token: process.env.GITHUB_TOKEN,

} as const;
