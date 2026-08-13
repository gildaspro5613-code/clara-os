/**
 * ============================================
 * CLARA OS
 * GitHub Connector
 * --------------------------------------------
 * File : github-engine.ts
 * Responsibility :
 * Executes real GitHub REST API operations.
 * ============================================
 */

import { githubConfig } from "@/lib/config/github";
import type { GitHubConnector } from "./github-connector";
import type { GitHubContext, GitHubOperation } from "./github-context";
import type {
  GitHubCommit,
  GitHubFile,
  GitHubIssue,
  GitHubRepository,
  GitHubResult,
} from "./github-result";

/**
 * Default number of items returned by paginated operations.
 */
const DEFAULT_PER_PAGE = 30;

/**
 * Maximum number of items accepted by GitHub paginated endpoints.
 */
const MAX_PER_PAGE = 100;

/**
 * GitHub REST repository payload.
 */
interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    url: string;
    avatar_url: string;
  };
  default_branch: string;
  html_url: string;
  url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * GitHub REST file payload.
 */
interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  encoding?: string;
  content?: string;
  html_url: string;
  download_url: string | null;
  type: string;
}

/**
 * GitHub REST issue payload.
 */
interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
  };
  labels: Array<{
    name?: string;
    color?: string;
  }>;
  pull_request?: {
    url: string;
  };
}

/**
 * GitHub REST commit payload.
 */
interface GitHubCommitResponse {
  sha: string;
  html_url: string;
  url: string;
  commit: {
    message: string;
    author: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
    committer: {
      date?: string;
    } | null;
  };
}

type GitHubEngineContract = Pick<
  GitHubConnector,
  | "execute"
  | "listRepositories"
  | "getRepository"
  | "getFile"
  | "listIssues"
  | "getCommits"
>;

/**
 * Engine that coordinates GitHub API operations.
 */
export class GitHubEngine implements GitHubEngineContract {

  /**
   * Returns the configured GitHub token or throws when absent.
   */
  private getToken(): string {

    const token = githubConfig.token;

    if (!token) {
      throw new Error(
        "GITHUB_TOKEN is missing. " +
        "Set this environment variable on the server.",
      );
    }

    return token;

  }

  /**
   * Normalizes the number of items requested from GitHub.
   */
  private resolvePerPage(perPage?: number): number {

    if (!perPage || perPage < 1) {
      return DEFAULT_PER_PAGE;
    }

    return Math.min(perPage, MAX_PER_PAGE);

  }

  /**
   * Creates a standardized failure result.
   */
  private createErrorResult(
    operation: GitHubOperation,
    error: string,
  ): GitHubResult {

    return {
      success: false,
      operation,
      error,
      completedAt: new Date(),
    };

  }

  /**
   * Sends an authenticated request to the GitHub REST API.
   */
  private async request<T>(
    path: string,
    query?: URLSearchParams,
    options?: RequestInit,
  ): Promise<T> {

    const token = this.getToken();
    const headers = new Headers();
    headers.set("Authorization", "Bearer " + token);
    headers.set("Accept", "application/vnd.github+json");
    headers.set("User-Agent", "Clara-OS");

    if (options?.headers) {
      new Headers(options.headers as HeadersInit).forEach(
        (value, key) => headers.set(key, value),
      );
    }

    const search = query?.toString();
    const url = `${githubConfig.apiBaseUrl}${path}${search ? `?${search}` : ""}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {

      const text = await response.text();

      throw new Error(
        `GitHub API error ${response.status}: ${text}`,
      );

    }

    return response.json() as Promise<T>;

  }

  /**
   * Builds a repository path segment.
   */
  private buildRepositoryPath(
    owner: string,
    repository: string,
  ): string {
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  }

  /**
   * Encodes a repository file path segment by segment.
   */
  private encodeRepositoryPath(path: string): string {
    return path
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  /**
   * Decodes GitHub base64 file content into UTF-8 text.
   */
  private decodeBase64Content(content: string): string {

    const binary = atob(content.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0),
    );

    return new TextDecoder().decode(bytes);

  }

  /**
   * Maps a GitHub repository payload into Clara's typed model.
   */
  private mapRepository(
    repository: GitHubRepositoryResponse,
  ): GitHubRepository {

    return {
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description ?? undefined,
      private: repository.private,
      owner: {
        login: repository.owner.login,
        url: repository.owner.url,
        avatarUrl: repository.owner.avatar_url,
      },
      defaultBranch: repository.default_branch,
      htmlUrl: repository.html_url,
      apiUrl: repository.url,
      language: repository.language ?? undefined,
      stargazersCount: repository.stargazers_count,
      forksCount: repository.forks_count,
      openIssuesCount: repository.open_issues_count,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
    };

  }

  /**
   * Maps a GitHub issue payload into Clara's typed model.
   */
  private mapIssue(issue: GitHubIssueResponse): GitHubIssue {

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      body: issue.body ?? undefined,
      author: issue.user.login,
      labels: issue.labels.map((label) => ({
        name: label.name ?? "",
        color: label.color ?? "",
      })),
      htmlUrl: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    };

  }

  /**
   * Maps a GitHub commit payload into Clara's typed model.
   */
  private mapCommit(commit: GitHubCommitResponse): GitHubCommit {

    return {
      sha: commit.sha,
      message: commit.commit.message.split("\n")[0],
      authorName: commit.commit.author?.name,
      authorEmail: commit.commit.author?.email,
      committedAt: commit.commit.committer?.date,
      htmlUrl: commit.html_url,
      apiUrl: commit.url,
    };

  }

  /**
   * Lists repositories accessible to the configured GitHub token.
   */
  public async listRepositories(
    context?: GitHubContext,
  ): Promise<GitHubResult> {

    try {

      const query = new URLSearchParams({
        page: String(context?.page ?? 1),
        per_page: String(this.resolvePerPage(context?.perPage)),
        sort: "updated",
      });

      const data = await this.request<GitHubRepositoryResponse[]>(
        "/user/repos",
        query,
      );

      const repositories = data.map((repository) => (
        this.mapRepository(repository)
      ));

      return {
        success: true,
        operation: "list-repositories",
        repositories,
        message: `${repositories.length} repositor${repositories.length === 1 ? "y" : "ies"} retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return this.createErrorResult(
        "list-repositories",
        error instanceof Error ? error.message : "Unknown GitHub error.",
      );

    }

  }

  /**
   * Retrieves a single repository by owner and name.
   */
  public async getRepository(
    context: GitHubContext,
  ): Promise<GitHubResult> {

    if (!context.owner || !context.repository) {
      return this.createErrorResult(
        "get-repository",
        "owner and repository are required for get-repository.",
      );
    }

    try {

      const data = await this.request<GitHubRepositoryResponse>(
        this.buildRepositoryPath(context.owner, context.repository),
      );

      const repository = this.mapRepository(data);

      return {
        success: true,
        operation: "get-repository",
        repository,
        message: `Repository ${repository.fullName} retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return this.createErrorResult(
        "get-repository",
        error instanceof Error ? error.message : "Unknown GitHub error.",
      );

    }

  }

  /**
   * Retrieves a repository file and its decoded content.
   */
  public async getFile(
    context: GitHubContext,
  ): Promise<GitHubResult> {

    if (!context.owner || !context.repository || !context.path) {
      return this.createErrorResult(
        "get-file",
        "owner, repository and path are required for get-file.",
      );
    }

    try {

      const query = context.ref
        ? new URLSearchParams({
            ref: context.ref,
          })
        : undefined;

      const data = await this.request<GitHubFileResponse>(
        `${this.buildRepositoryPath(context.owner, context.repository)}/contents/${this.encodeRepositoryPath(context.path)}`,
        query,
      );

      if (data.type !== "file") {
        return this.createErrorResult(
          "get-file",
          `Path ${context.path} is not a file.`,
        );
      }

      if (!data.content || !data.encoding) {
        return this.createErrorResult(
          "get-file",
          `File content is unavailable for path ${context.path}.`,
        );
      }

      if (data.encoding !== "base64") {
        return this.createErrorResult(
          "get-file",
          `Unsupported file encoding "${data.encoding}" for path ${context.path}.`,
        );
      }

      const file: GitHubFile = {
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        encoding: data.encoding,
        content: this.decodeBase64Content(data.content),
        htmlUrl: data.html_url,
        downloadUrl: data.download_url ?? undefined,
      };

      return {
        success: true,
        operation: "get-file",
        file,
        message: `File ${file.path} retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return this.createErrorResult(
        "get-file",
        error instanceof Error ? error.message : "Unknown GitHub error.",
      );

    }

  }

  /**
   * Lists open issues for a repository.
   * GitHub includes pull requests in this endpoint, so the returned
   * issue count can be lower than the requested perPage value.
   */
  public async listIssues(
    context: GitHubContext,
  ): Promise<GitHubResult> {

    if (!context.owner || !context.repository) {
      return this.createErrorResult(
        "list-issues",
        "owner and repository are required for list-issues.",
      );
    }

    try {

      const query = new URLSearchParams({
        state: "open",
        page: String(context.page ?? 1),
        per_page: String(this.resolvePerPage(context.perPage)),
      });

      const data = await this.request<GitHubIssueResponse[]>(
        `${this.buildRepositoryPath(context.owner, context.repository)}/issues`,
        query,
      );

      const issues = data
        .filter((issue) => !issue.pull_request)
        .map((issue) => this.mapIssue(issue));

      return {
        success: true,
        operation: "list-issues",
        issues,
        message:
          `${issues.length} open issue(s) retrieved ` +
          "from the current page after excluding pull requests; " +
          "the count may be lower than perPage because GitHub mixes pull requests into this endpoint.",
        completedAt: new Date(),
      };

    } catch (error) {

      return this.createErrorResult(
        "list-issues",
        error instanceof Error ? error.message : "Unknown GitHub error.",
      );

    }

  }

  /**
   * Retrieves the recent commit history for a repository.
   */
  public async getCommits(
    context: GitHubContext,
  ): Promise<GitHubResult> {

    if (!context.owner || !context.repository) {
      return this.createErrorResult(
        "get-commits",
        "owner and repository are required for get-commits.",
      );
    }

    try {

      const query = new URLSearchParams({
        page: String(context.page ?? 1),
        per_page: String(this.resolvePerPage(context.perPage)),
      });

      if (context.ref) {
        query.set("sha", context.ref);
      }

      const data = await this.request<GitHubCommitResponse[]>(
        `${this.buildRepositoryPath(context.owner, context.repository)}/commits`,
        query,
      );

      const commits = data.map((commit) => this.mapCommit(commit));

      return {
        success: true,
        operation: "get-commits",
        commits,
        message: `${commits.length} commit(s) retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return this.createErrorResult(
        "get-commits",
        error instanceof Error ? error.message : "Unknown GitHub error.",
      );

    }

  }

  /**
   * Executes a GitHub operation from its context.
   */
  public async execute(
    context: GitHubContext,
  ): Promise<GitHubResult> {

    switch (context.operation) {

      case "list-repositories":
        return this.listRepositories(context);

      case "get-repository":
        return this.getRepository(context);

      case "get-file":
        return this.getFile(context);

      case "list-issues":
        return this.listIssues(context);

      case "get-commits":
        return this.getCommits(context);

      default: {
        const exhaustive: never = context.operation;
        return this.createErrorResult(
          exhaustive,
          `Unknown GitHub operation: ${exhaustive}.`,
        );
      }

    }

  }

}
