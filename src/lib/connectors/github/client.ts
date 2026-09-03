import { normalizeGitHubError } from "./errors";
import type { GitHubCommentDraft, GitHubFileContent, GitHubFileDraft, GitHubIssueDraft, GitHubPagination, GitHubPullRequestDraft, GitHubRepositoryRef } from "./types";

export type GitHubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Query = Record<string, string | number | boolean | undefined>;

function repositoryPath({ owner, repo }: GitHubRepositoryRef): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}
function query(values: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
  const result = params.toString();
  return result ? `?${result}` : "";
}
function pagination(input: GitHubPagination): Query {
  return { page: Math.max(1, input.page ?? 1), per_page: Math.min(100, Math.max(1, input.perPage ?? 30)) };
}

export class GitHubClient {
  private readonly fetcher: GitHubFetch;
  private readonly baseUrl: string;
  constructor(private readonly options: { accessToken: string; tokenType?: "Bearer" | "token"; fetch?: GitHubFetch; baseUrl?: string }) {
    if (!options.accessToken.trim()) throw new Error("GitHub access token is required.");
    this.fetcher = options.fetch ?? fetch;
    this.baseUrl = (options.baseUrl ?? "https://api.github.com").replace(/\/$/, "");
  }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers: { accept: "application/vnd.github+json", authorization: `${this.options.tokenType ?? "Bearer"} ${this.options.accessToken}`, "x-github-api-version": "2022-11-28", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers } });
    if (!response.ok) throw await normalizeGitHubError(response, [this.options.accessToken]);
    if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
    return await response.json() as T;
  }
  listRepositories(input: GitHubPagination & { affiliation?: string; visibility?: string } = {}) { return this.request<unknown[]>(`/user/repos${query({ ...pagination(input), affiliation: input.affiliation, visibility: input.visibility })}`); }
  getRepository(input: GitHubRepositoryRef) { return this.request<Record<string, unknown>>(repositoryPath(input)); }
  listBranches(input: GitHubRepositoryRef & GitHubPagination) { return this.request<unknown[]>(`${repositoryPath(input)}/branches${query(pagination(input))}`); }
  async readFile(input: GitHubRepositoryRef & { path: string; ref?: string }): Promise<GitHubFileContent> {
    const file = await this.request<{ name: string; path: string; sha: string; size: number; content?: string; encoding?: string; html_url?: string }>(`${repositoryPath(input)}/contents/${input.path.split("/").map(encodeURIComponent).join("/")}${query({ ref: input.ref })}`);
    if (file.encoding !== "base64" || typeof file.content !== "string") throw new Error("GitHub file response does not contain base64 content.");
    return { name: file.name, path: file.path, sha: file.sha, size: file.size, content: Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8"), encoding: "utf-8", htmlUrl: file.html_url };
  }
  listCommits(input: GitHubRepositoryRef & GitHubPagination & { sha?: string; path?: string }) { return this.request<unknown[]>(`${repositoryPath(input)}/commits${query({ ...pagination(input), sha: input.sha, path: input.path })}`); }
  listIssues(input: GitHubRepositoryRef & GitHubPagination & { state?: "open" | "closed" | "all" }) { return this.request<unknown[]>(`${repositoryPath(input)}/issues${query({ ...pagination(input), state: input.state })}`); }
  getIssue(input: GitHubRepositoryRef & { issueNumber: number }) { return this.request<Record<string, unknown>>(`${repositoryPath(input)}/issues/${input.issueNumber}`); }
  listPullRequests(input: GitHubRepositoryRef & GitHubPagination & { state?: "open" | "closed" | "all" }) { return this.request<unknown[]>(`${repositoryPath(input)}/pulls${query({ ...pagination(input), state: input.state })}`); }
  getPullRequest(input: GitHubRepositoryRef & { pullNumber: number }) { return this.request<Record<string, unknown>>(`${repositoryPath(input)}/pulls/${input.pullNumber}`); }
  readChecks(input: GitHubRepositoryRef & { ref: string } & GitHubPagination) { return this.request<Record<string, unknown>>(`${repositoryPath(input)}/commits/${encodeURIComponent(input.ref)}/check-runs${query(pagination(input))}`); }
  createIssue(input: GitHubIssueDraft) { const { owner, repo, ...body } = input; return this.request<Record<string, unknown>>(`${repositoryPath({ owner, repo })}/issues`, { method: "POST", body: JSON.stringify(body) }); }
  updateIssue(input: GitHubRepositoryRef & { issueNumber: number; changes: Record<string, unknown> }) { return this.request<Record<string, unknown>>(`${repositoryPath(input)}/issues/${input.issueNumber}`, { method: "PATCH", body: JSON.stringify(input.changes) }); }
  createPullRequest(input: GitHubPullRequestDraft) { const { owner, repo, ...body } = input; return this.request<Record<string, unknown>>(`${repositoryPath({ owner, repo })}/pulls`, { method: "POST", body: JSON.stringify(body) }); }
  createComment(input: GitHubCommentDraft) { const { owner, repo, issueNumber, ...body } = input; return this.request<Record<string, unknown>>(`${repositoryPath({ owner, repo })}/issues/${issueNumber}/comments`, { method: "POST", body: JSON.stringify(body) }); }
  updateFile(input: GitHubFileDraft) { const { owner, repo, path, content, ...body } = input; return this.request<Record<string, unknown>>(`${repositoryPath({ owner, repo })}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "PUT", body: JSON.stringify({ ...body, content: Buffer.from(content, "utf8").toString("base64") }) }); }
  createBranch(input: GitHubRepositoryRef & { branch: string; sha: string }) { return this.request<Record<string, unknown>>(`${repositoryPath(input)}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: input.sha }) }); }
  mergePullRequest(input: GitHubRepositoryRef & { pullNumber: number; commitTitle?: string; commitMessage?: string; mergeMethod?: "merge" | "squash" | "rebase" }) { return this.request<Record<string, unknown>>(`${repositoryPath(input)}/pulls/${input.pullNumber}/merge`, { method: "PUT", body: JSON.stringify({ commit_title: input.commitTitle, commit_message: input.commitMessage, merge_method: input.mergeMethod }) }); }
}
