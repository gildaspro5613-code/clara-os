/**
 * ============================================
 * CLARA OS
 * GitHub Connector
 * --------------------------------------------
 * File : github-result.ts
 * Responsibility :
 * Defines the typed results returned
 * by GitHub operations.
 * ============================================
 */

import type { GitHubOperation } from "./github-context";

/**
 * GitHub repository owner.
 */
export interface GitHubRepositoryOwner {

  /**
   * GitHub login.
   */
  login: string;

  /**
   * GitHub profile URL.
   */
  url: string;

  /**
   * GitHub avatar URL.
   */
  avatarUrl: string;

}

/**
 * GitHub repository.
 */
export interface GitHubRepository {

  /**
   * Repository identifier.
   */
  id: number;

  /**
   * Repository name.
   */
  name: string;

  /**
   * Full repository name.
   */
  fullName: string;

  /**
   * Repository description.
   */
  description?: string;

  /**
   * Whether the repository is private.
   */
  private: boolean;

  /**
   * Repository owner.
   */
  owner: GitHubRepositoryOwner;

  /**
   * Default branch name.
   */
  defaultBranch: string;

  /**
   * Repository HTML URL.
   */
  htmlUrl: string;

  /**
   * Repository API URL.
   */
  apiUrl: string;

  /**
   * Main language detected by GitHub.
   */
  language?: string;

  /**
   * Number of stars.
   */
  stargazersCount: number;

  /**
   * Number of forks.
   */
  forksCount: number;

  /**
   * Number of open issues.
   */
  openIssuesCount: number;

  /**
   * Repository creation date.
   */
  createdAt: string;

  /**
   * Repository last update date.
   */
  updatedAt: string;

}

/**
 * GitHub repository file.
 */
export interface GitHubFile {

  /**
   * File name.
   */
  name: string;

  /**
   * File path in the repository.
   */
  path: string;

  /**
   * Blob SHA.
   */
  sha: string;

  /**
   * File size in bytes.
   */
  size: number;

  /**
   * File content encoding.
   */
  encoding: string;

  /**
   * Decoded file content.
   */
  content: string;

  /**
   * GitHub HTML URL for the file.
   */
  htmlUrl: string;

  /**
   * Raw download URL for the file when available.
   */
  downloadUrl?: string;

}

/**
 * GitHub issue label.
 */
export interface GitHubIssueLabel {

  /**
   * Label name.
   */
  name: string;

  /**
   * Hexadecimal label color.
   */
  color: string;

}

/**
 * GitHub issue.
 */
export interface GitHubIssue {

  /**
   * Issue identifier.
   */
  id: number;

  /**
   * Issue number.
   */
  number: number;

  /**
   * Issue title.
   */
  title: string;

  /**
   * Issue state.
   */
  state: string;

  /**
   * Issue body.
   */
  body?: string;

  /**
   * Issue author login.
   */
  author: string;

  /**
   * Issue labels.
   */
  labels: GitHubIssueLabel[];

  /**
   * GitHub HTML URL for the issue.
   */
  htmlUrl: string;

  /**
   * Issue creation date.
   */
  createdAt: string;

  /**
   * Issue last update date.
   */
  updatedAt: string;

}

/**
 * GitHub commit.
 */
export interface GitHubCommit {

  /**
   * Commit SHA.
   */
  sha: string;

  /**
   * Short commit message.
   */
  message: string;

  /**
   * Commit author display name.
   */
  authorName?: string;

  /**
   * Commit author email.
   */
  authorEmail?: string;

  /**
   * Commit date.
   */
  committedAt?: string;

  /**
   * GitHub HTML URL for the commit.
   */
  htmlUrl: string;

  /**
   * GitHub API URL for the commit.
   */
  apiUrl: string;

}

/**
 * Result returned by a GitHub operation.
 */
export interface GitHubResult {

  /**
   * Operation status.
   */
  readonly success: boolean;

  /**
   * Executed operation name.
   */
  readonly operation: GitHubOperation;

  /**
   * Returned repositories.
   */
  readonly repositories?: GitHubRepository[];

  /**
   * Returned repository.
   */
  readonly repository?: GitHubRepository;

  /**
   * Returned repository file.
   */
  readonly file?: GitHubFile;

  /**
   * Returned issues.
   */
  readonly issues?: GitHubIssue[];

  /**
   * Returned commits.
   */
  readonly commits?: GitHubCommit[];

  /**
   * Human-readable result message.
   */
  readonly message?: string;

  /**
   * Error description if the operation failed.
   */
  readonly error?: string;

  /**
   * Execution date.
   */
  readonly completedAt: Date;

}
