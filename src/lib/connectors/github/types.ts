export interface GitHubCredentials {
  accessToken: string;
  tokenType?: "Bearer" | "token";
  expiresAt?: string;
  installationId?: number;
}

export interface GitHubRepositoryRef { owner: string; repo: string }
export interface GitHubPagination { page?: number; perPage?: number }
export interface GitHubIssueDraft { owner: string; repo: string; title: string; body?: string; labels?: string[]; assignees?: string[] }
export interface GitHubPullRequestDraft { owner: string; repo: string; title: string; head: string; base: string; body?: string; draft?: boolean }
export interface GitHubCommentDraft { owner: string; repo: string; issueNumber: number; body: string }
export interface GitHubFileDraft { owner: string; repo: string; path: string; message: string; content: string; branch?: string; sha?: string }

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
  encoding: "utf-8";
  htmlUrl?: string;
}
