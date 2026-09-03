const SENSITIVE_KEYS = /token|authorization|api[-_]?key|credential|secret/i;

function sanitize(value: unknown, secrets: readonly string[]): unknown {
  if (typeof value === "string") return secrets.reduce((text, secret) => secret ? text.replaceAll(secret, "[REDACTED]") : text, value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, secrets));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEYS.test(key) ? "[REDACTED]" : sanitize(item, secrets)]));
  return value;
}

export type GitHubErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION_FAILED" | "RATE_LIMITED" | "API_ERROR";

export class GitHubApiError extends Error {
  constructor(public readonly status: number, public readonly code: GitHubErrorCode, message: string, public readonly details?: unknown, public readonly retryAfterSeconds?: number) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export async function normalizeGitHubError(response: Response, secrets: readonly string[]): Promise<GitHubApiError> {
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }
  const safe = sanitize(body, secrets);
  const message = safe && typeof safe === "object" && "message" in safe && typeof safe.message === "string" ? safe.message : `GitHub request failed with status ${response.status}.`;
  const remaining = response.headers.get("x-ratelimit-remaining");
  const code: GitHubErrorCode = response.status === 401 ? "UNAUTHORIZED" : response.status === 403 && remaining === "0" ? "RATE_LIMITED" : response.status === 403 ? "FORBIDDEN" : response.status === 404 ? "NOT_FOUND" : response.status === 409 ? "CONFLICT" : response.status === 422 ? "VALIDATION_FAILED" : response.status === 429 ? "RATE_LIMITED" : "API_ERROR";
  const retryAfter = Number(response.headers.get("retry-after"));
  return new GitHubApiError(response.status, code, message, safe, Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined);
}
