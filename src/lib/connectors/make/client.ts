import type {
  MakeScenarioConfiguration,
  MakeScenarioExecutionResult,
  MakeScenarioExecutionStatus,
  MakeScenarioInvocation,
} from "./types";

export type MakeFetch = typeof fetch;
export type MakeWebhookErrorCode = "INVALID_URL" | "INVALID_CONFIGURATION" | "TIMEOUT" | "NETWORK_ERROR" | "HTTP_ERROR";

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 39_000;
const FORBIDDEN_HEADERS = new Set(["host", "content-length", "transfer-encoding", "connection", "content-type"]);

export class MakeWebhookError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code: MakeWebhookErrorCode = "HTTP_ERROR",
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "MakeWebhookError";
  }
}

function assertWebhookUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch {
    throw new MakeWebhookError("Invalid Make webhook URL.", undefined, "INVALID_URL");
  }
  const hostname = url.hostname.toLowerCase();
  const makeHost = hostname === "hook.make.com" || hostname.endsWith(".make.com") || hostname === "hook.integromat.com" || hostname.endsWith(".integromat.com");
  if (url.protocol !== "https:" || !makeHost || url.username || url.password || url.hash || url.search || url.pathname === "/") {
    throw new MakeWebhookError("Make webhook URL is not an approved Make HTTPS endpoint.", undefined, "INVALID_URL");
  }
  return url;
}

function assertHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  if (Object.getPrototypeOf(headers) !== Object.prototype || Object.keys(headers).length > 32) {
    throw new MakeWebhookError("Invalid Make webhook headers.", undefined, "INVALID_CONFIGURATION");
  }
  for (const [name, value] of Object.entries(headers)) {
    if (!name.trim() || FORBIDDEN_HEADERS.has(name.toLowerCase()) || typeof value !== "string" || value.length > 4096 || /[\r\n]/.test(value)) {
      throw new MakeWebhookError("Invalid Make webhook header configuration.", undefined, "INVALID_CONFIGURATION");
    }
  }
  return headers;
}

function resolveTimeoutMs(value?: number): number {
  if (value === undefined) return DEFAULT_TIMEOUT_MS;
  if (typeof value !== "number" || !Number.isFinite(value) || value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) {
    throw new MakeWebhookError("Invalid Make webhook timeout.", undefined, "INVALID_CONFIGURATION");
  }
  return Math.trunc(value);
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

function readExecutionMetadata(response: Response, data: unknown): { executionStatus: MakeScenarioExecutionStatus; executionId?: string } {
  // HTTP success attests a handoff, not completion of the scenario or its
  // downstream business operation. Only an explicit contract status may do so.
  let executionStatus: MakeScenarioExecutionStatus = "accepted";
  let executionId: string | undefined;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const status = record.executionStatus ?? record.execution_status ?? record.status;
    // A successful HTTP transport is not a successful business operation.
    // Do not expose provider content (which may contain personal data/secrets).
    if (record.ok === false || record.success === false ||
        [record.executionStatus, record.execution_status, record.status].some(value =>
          typeof value === "string" && ["failed", "error", "rejected", "cancelled"].includes(value.toLowerCase()))) {
      throw new MakeWebhookError("Make reported an unsuccessful scenario execution.", response.status, "HTTP_ERROR", false);
    }
    if (status === "accepted" || status === "pending" || status === "completed") executionStatus = status;
    const id = record.executionId ?? record.execution_id;
    if (typeof id === "string" && id.trim()) executionId = id.trim();
  }
  return { executionStatus, executionId };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Thin HTTP client for approved Make custom-webhook invocations. */
export class MakeWebhookClient {
  constructor(private readonly fetcher: MakeFetch = fetch) {}

  async execute(configuration: MakeScenarioConfiguration, invocation: MakeScenarioInvocation): Promise<MakeScenarioExecutionResult> {
    const url = assertWebhookUrl(configuration.url);
    const headers = assertHeaders(configuration.headers);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(configuration.timeoutMs));
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ scenarioKey: invocation.scenarioKey, payload: invocation.payload ?? {}, source: "clara-os" }),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        throw new MakeWebhookError("Make outcome is unconfirmed after timeout; do not resend automatically.", undefined, "TIMEOUT", false);
      }
      throw new MakeWebhookError("Make outcome is unconfirmed after a network error; do not resend automatically.", undefined, "NETWORK_ERROR", false);
    } finally { clearTimeout(timeout); }

    const data = await readResponse(response);
    if (!response.ok) {
      throw new MakeWebhookError(
        `Make scenario execution failed with status ${response.status}.`,
        response.status,
        "HTTP_ERROR",
        false, // A POST may already have produced an effect, even on HTTP failure.
      );
    }
    const metadata = readExecutionMetadata(response, data);
    return { ok: true, scenarioKey: invocation.scenarioKey, status: response.status, executionStatus: metadata.executionStatus, executionId: metadata.executionId, data };
  }
}
