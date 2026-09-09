import type {
  MakeScenarioConfiguration,
  MakeScenarioExecutionResult,
  MakeScenarioExecutionStatus,
  MakeScenarioInvocation,
} from "./types";

export type MakeFetch = typeof fetch;

export type MakeWebhookErrorCode =
  | "INVALID_URL"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "HTTP_ERROR";

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 39_000;

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
  try {
    url = new URL(value);
  } catch {
    throw new MakeWebhookError("Invalid Make webhook URL.", undefined, "INVALID_URL");
  }
  if (url.protocol !== "https:") {
    throw new MakeWebhookError("Make webhook URL must use HTTPS.", undefined, "INVALID_URL");
  }
  return url;
}

function resolveTimeoutMs(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(value)));
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readExecutionMetadata(
  response: Response,
  data: unknown,
): { executionStatus: MakeScenarioExecutionStatus; executionId?: string } {
  let executionStatus: MakeScenarioExecutionStatus = response.status === 202 ? "accepted" : "completed";
  let executionId: string | undefined;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const status = record.executionStatus ?? record.execution_status ?? record.status;
    if (status === "accepted" || status === "pending" || status === "completed") {
      executionStatus = status;
    }

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

  async execute(
    configuration: MakeScenarioConfiguration,
    invocation: MakeScenarioInvocation,
  ): Promise<MakeScenarioExecutionResult> {
    const url = assertWebhookUrl(configuration.url);
    const controller = new AbortController();
    const timeoutMs = resolveTimeoutMs(configuration.timeoutMs);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(configuration.headers ?? {}),
        },
        body: JSON.stringify({
          scenarioKey: invocation.scenarioKey,
          payload: invocation.payload ?? {},
          source: "clara-os",
        }),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        throw new MakeWebhookError(
          "Make scenario execution timed out.",
          undefined,
          "TIMEOUT",
          true,
        );
      }
      throw new MakeWebhookError(
        "Make scenario execution failed because the provider could not be reached.",
        undefined,
        "NETWORK_ERROR",
        true,
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await readResponse(response);
    if (!response.ok) {
      throw new MakeWebhookError(
        `Make scenario execution failed with status ${response.status}.`,
        response.status,
        "HTTP_ERROR",
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }

    const metadata = readExecutionMetadata(response, data);
    return {
      ok: true,
      scenarioKey: invocation.scenarioKey,
      status: response.status,
      executionStatus: metadata.executionStatus,
      executionId: metadata.executionId,
      data,
    };
  }
}
