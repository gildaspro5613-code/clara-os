/**
 * ============================================
 * CLARA OS
 * GitHub Connector
 * --------------------------------------------
 * File : github-context.ts
 * Responsibility :
 * Defines the execution context
 * for GitHub operations.
 * ============================================
 */

/**
 * GitHub operations supported by Clara.
 */
export type GitHubOperation =
  | "list-repositories"
  | "get-repository"
  | "get-file"
  | "list-issues"
  | "get-commits";

/**
 * Execution context for a GitHub operation.
 */
export interface GitHubContext {

  /**
   * Operation to execute.
   */
  operation: GitHubOperation;

  /**
   * Repository owner login or organization name.
   */
  owner?: string;

  /**
   * Repository name.
   */
  repository?: string;

  /**
   * Repository file path.
   */
  path?: string;

  /**
   * Git reference used to resolve a file or commit history.
   */
  ref?: string;

  /**
   * Page number for paginated operations.
   */
  page?: number;

  /**
   * Maximum number of items to retrieve.
   */
  perPage?: number;

}
