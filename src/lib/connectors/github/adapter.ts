import type { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { GitHubClient, type GitHubFetch } from "./client";
import { GITHUB_CAPABILITIES } from "./definition";
import type { GitHubCommentDraft, GitHubCredentials, GitHubFileDraft, GitHubIssueDraft, GitHubPagination, GitHubPullRequestDraft, GitHubRepositoryRef } from "./types";

type RepoPage = GitHubRepositoryRef & GitHubPagination;
export type GitHubCapabilityInput =
  | { capability: typeof GITHUB_CAPABILITIES.REPOSITORY_LIST; input: GitHubPagination & { affiliation?: string; visibility?: string } }
  | { capability: typeof GITHUB_CAPABILITIES.REPOSITORY_READ; input: GitHubRepositoryRef }
  | { capability: typeof GITHUB_CAPABILITIES.BRANCH_LIST; input: RepoPage }
  | { capability: typeof GITHUB_CAPABILITIES.FILE_READ; input: GitHubRepositoryRef & { path: string; ref?: string } }
  | { capability: typeof GITHUB_CAPABILITIES.COMMIT_LIST; input: RepoPage & { sha?: string; path?: string } }
  | { capability: typeof GITHUB_CAPABILITIES.ISSUE_LIST; input: RepoPage & { state?: "open" | "closed" | "all" } }
  | { capability: typeof GITHUB_CAPABILITIES.ISSUE_READ; input: GitHubRepositoryRef & { issueNumber: number } }
  | { capability: typeof GITHUB_CAPABILITIES.PULL_REQUEST_LIST; input: RepoPage & { state?: "open" | "closed" | "all" } }
  | { capability: typeof GITHUB_CAPABILITIES.PULL_REQUEST_READ; input: GitHubRepositoryRef & { pullNumber: number } }
  | { capability: typeof GITHUB_CAPABILITIES.CHECKS_READ; input: RepoPage & { ref: string } }
  | { capability: typeof GITHUB_CAPABILITIES.ISSUE_PREPARE; input: GitHubIssueDraft }
  | { capability: typeof GITHUB_CAPABILITIES.PULL_REQUEST_PREPARE; input: GitHubPullRequestDraft }
  | { capability: typeof GITHUB_CAPABILITIES.COMMENT_PREPARE; input: GitHubCommentDraft }
  | { capability: typeof GITHUB_CAPABILITIES.FILE_PREPARE; input: GitHubFileDraft }
  | { capability: typeof GITHUB_CAPABILITIES.ISSUE_CREATE; input: GitHubIssueDraft }
  | { capability: typeof GITHUB_CAPABILITIES.ISSUE_UPDATE; input: GitHubRepositoryRef & { issueNumber: number; changes: Record<string, unknown> } }
  | { capability: typeof GITHUB_CAPABILITIES.PULL_REQUEST_CREATE; input: GitHubPullRequestDraft }
  | { capability: typeof GITHUB_CAPABILITIES.COMMENT_CREATE; input: GitHubCommentDraft }
  | { capability: typeof GITHUB_CAPABILITIES.FILE_UPDATE; input: GitHubFileDraft }
  | { capability: typeof GITHUB_CAPABILITIES.BRANCH_CREATE; input: GitHubRepositoryRef & { branch: string; sha: string } }
  | { capability: typeof GITHUB_CAPABILITIES.PULL_REQUEST_MERGE; input: GitHubRepositoryRef & { pullNumber: number; commitTitle?: string; commitMessage?: string; mergeMethod?: "merge" | "squash" | "rebase" } };

export interface GitHubCapabilityResult { provider: "github"; capability: GitHubCapabilityInput["capability"]; data: unknown }

/** Provider-only adapter. Runtime and the Autonomy Gate remain responsible for authorization. */
export class GitHubConnectorAdapter {
  constructor(private readonly resolver: ConnectionResolver, private readonly fetcher?: GitHubFetch, private readonly baseUrl?: string) {}

  async execute(connectionId: string, request: GitHubCapabilityInput): Promise<GitHubCapabilityResult> {
    const { credentials } = await this.resolver.resolve<GitHubCredentials>(connectionId, "github");
    const client = new GitHubClient({ accessToken: credentials.accessToken, tokenType: credentials.tokenType, fetch: this.fetcher, baseUrl: this.baseUrl });
    let data: unknown;
    switch (request.capability) {
      case GITHUB_CAPABILITIES.REPOSITORY_LIST: data = await client.listRepositories(request.input); break;
      case GITHUB_CAPABILITIES.REPOSITORY_READ: data = await client.getRepository(request.input); break;
      case GITHUB_CAPABILITIES.BRANCH_LIST: data = await client.listBranches(request.input); break;
      case GITHUB_CAPABILITIES.FILE_READ: data = await client.readFile(request.input); break;
      case GITHUB_CAPABILITIES.COMMIT_LIST: data = await client.listCommits(request.input); break;
      case GITHUB_CAPABILITIES.ISSUE_LIST: data = await client.listIssues(request.input); break;
      case GITHUB_CAPABILITIES.ISSUE_READ: data = await client.getIssue(request.input); break;
      case GITHUB_CAPABILITIES.PULL_REQUEST_LIST: data = await client.listPullRequests(request.input); break;
      case GITHUB_CAPABILITIES.PULL_REQUEST_READ: data = await client.getPullRequest(request.input); break;
      case GITHUB_CAPABILITIES.CHECKS_READ: data = await client.readChecks(request.input); break;
      case GITHUB_CAPABILITIES.ISSUE_PREPARE:
      case GITHUB_CAPABILITIES.PULL_REQUEST_PREPARE:
      case GITHUB_CAPABILITIES.COMMENT_PREPARE:
      case GITHUB_CAPABILITIES.FILE_PREPARE: data = { prepared: true, input: request.input }; break;
      case GITHUB_CAPABILITIES.ISSUE_CREATE: data = await client.createIssue(request.input); break;
      case GITHUB_CAPABILITIES.ISSUE_UPDATE: data = await client.updateIssue(request.input); break;
      case GITHUB_CAPABILITIES.PULL_REQUEST_CREATE: data = await client.createPullRequest(request.input); break;
      case GITHUB_CAPABILITIES.COMMENT_CREATE: data = await client.createComment(request.input); break;
      case GITHUB_CAPABILITIES.FILE_UPDATE: data = await client.updateFile(request.input); break;
      case GITHUB_CAPABILITIES.BRANCH_CREATE: data = await client.createBranch(request.input); break;
      case GITHUB_CAPABILITIES.PULL_REQUEST_MERGE: data = await client.mergePullRequest(request.input); break;
    }
    return { provider: "github", capability: request.capability, data };
  }
}
