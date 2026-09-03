const SENSITIVE_KEYS = /token|authorization|api[-_]?key|credential|secret/i;

function sanitize(value: unknown, sensitiveValues: readonly string[]): unknown {
  if (typeof value === "string") {
    return sensitiveValues.reduce(
      (result, secret) => secret ? result.replaceAll(secret, "[REDACTED]") : result,
      value,
    );
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, sensitiveValues));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.test(key) ? "[REDACTED]" : sanitize(item, sensitiveValues),
      ]),
    );
  }
  return value;
}

export class BrevoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "NOT_FOUND" | "API_ERROR",
    message: string,
    public readonly details?: unknown,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "BrevoApiError";
  }
}

export async function normalizeBrevoError(
  response: Response,
  sensitiveValues: readonly string[] = [],
): Promise<BrevoApiError> {
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }
  const safeBody = sanitize(body, sensitiveValues);
  const providerMessage = safeBody && typeof safeBody === "object" &&
    "message" in safeBody && typeof safeBody.message === "string"
    ? safeBody.message
    : `Brevo request failed with status ${response.status}.`;
  const code = response.status === 401 ? "UNAUTHORIZED"
    : response.status === 403 ? "FORBIDDEN"
    : response.status === 429 ? "RATE_LIMITED"
    : response.status === 404 ? "NOT_FOUND"
    : "API_ERROR";
  const retryAfter = Number(response.headers.get("retry-after"));
  return new BrevoApiError(
    response.status,
    code,
    providerMessage,
    safeBody,
    Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined,
  );
}
