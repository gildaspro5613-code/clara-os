/**
 * ============================================
 * CLARA OS
 * GitHub Connector
 * --------------------------------------------
 * File : github-connector.ts
 * Responsibility :
 * Defines the GitHub connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import type { GitHubContext } from "./github-context";
import type { GitHubResult } from "./github-result";

/**
 * GitHub connector.
 */
export interface GitHubConnector extends Connector {

  /**
   * Executes a GitHub operation.
   */
  execute(context: GitHubContext): Promise<GitHubResult>;

  /**
   * Lists repositories accessible to the configured GitHub token.
   */
  listRepositories(context?: GitHubContext): Promise<GitHubResult>;

  /**
   * Retrieves a single repository by owner and name.
   */
  getRepository(context: GitHubContext): Promise<GitHubResult>;

  /**
   * Retrieves a repository file and its decoded content.
   */
  getFile(context: GitHubContext): Promise<GitHubResult>;

  /**
   * Lists open issues for a repository.
   */
  listIssues(context: GitHubContext): Promise<GitHubResult>;

  /**
   * Retrieves the recent commit history for a repository.
   */
  getCommits(context: GitHubContext): Promise<GitHubResult>;

}
