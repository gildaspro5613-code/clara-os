/**
 * ============================================
 * CLARA OS
 * GitHub Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the GitHub connector module.
 * ============================================
 */

import { GitHubEngine } from "./github-engine";

/**
 * GitHub connector module.
 */
export const GITHUB_MODULE = {

  id: "github",

  name: "GitHub",

  version: "1.0.0",

  description:
    "Provides read-only access to GitHub repositories, files, issues, and commits through Clara OS.",

  engine: new GitHubEngine(),

} as const;
