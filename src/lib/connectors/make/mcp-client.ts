import type {
  MakeScenarioExecutionResult,
  MakeScenarioInvocation,
} from "./types";

export type MakeMcpFetch = typeof fetch;

export type MakeMcpErrorCode =
  | "INVALID_URL"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE";

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 39_000;

export interface MakeMcpConfiguration {
  /** Make MCP/Toolbox endpoint. Stored only in CredentialStore. */
  url: string;
  /** Bearer token for the Toolbox/MCP endpoint. Stored only in CredentialStore. */
  bearerToken: string;
  /** Optional explicit tool-name mapping when Make exposes a name different from the Clara scenario key. */
  tools?: Record<string, string>;
  timeoutMs?: number;
}

export class MakeMcpError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code: MakeMcpErrorCode = "HTTP_ERROR",
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "MakeMcpError";
  }
}

function assertHttpsUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MakeMcpError("Invalid Make MCP URL.", undefined, "INVALID_URL");
  }
  if (url.protocol !== "https:") {
    throw new MakeMcpError("Make MCP URL must use HTTPS.", undefined, "INVALID_URL");
  }
  return url;
}

function resolveTimeoutMs(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(value)));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function readJsonRpcResult(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    throw new MakeMcpError("Make MCP returned an invalid response.", undefined, "INVALID_RESPONSE");
  }
  const record = data as Record<string, unknown>;
  if (record.error && typeof record.error === "object") {
    const error = record.error as Record<string, unknown>;
    const message = typeof error.message === "string" ? error.message : "Make MCP tool execution failed.";
    throw new MakeMcpError(message, undefined, "HTTP_ERROR");
  }
  if (!("result" in record)) {
    throw new MakeMcpError("Make MCP response is missing a result.", undefined, "INVALID_RESPONSE");
  }
  return record.result;
}

/**
 * Minimal MCP transport for Make Toolboxes.
 * The capability layer stays provider-neutral: this client only knows how to call
 * a Toolbox tool by a stable server-side mapping.
 */
export class MakeMcpClient {
  constructor(private readonly fetcher: MakeMcpFetch = fetch) {}

  async execute(
    configuration: MakeMcpConfiguration,
    invocation: MakeScenarioInvocation,
  ): Promise<MakeScenarioExecutionResult> {
    const url = assertHttpsUrl(configuration.url);
    const bearerToken = configuration.bearerToken.trim();
    if (!bearerToken) {
      throw new MakeMcpError("Make MCP bearer token is missing.", undefined, "INVALID_RESPONSE");
    }

    const toolName = configuration.tools?.[invocation.scenarioKey] ?? invocation.scenarioKey;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(configuration.timeoutMs));

    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "tools/call",
          params: {
            name: toolName,
            arguments: invocation.payload ?? {},
          },
        }),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        throw new MakeMcpError("Make MCP execution timed out.", undefined, "TIMEOUT", true);
      }
      throw new MakeMcpError(
        "Make MCP could not be reached.",
        undefined,
        "NETWORK_ERROR",
        true,
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      throw new MakeMcpError(
        `Make MCP execution failed with status ${response.status}.`,
        response.status,
        "HTTP_ERROR",
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }

    const result = readJsonRpcResult(data);
    return {
      ok: true,
      scenarioKey: invocation.scenarioKey,
      status: response.status,
      executionStatus: "completed",
      data: result,
    };
  }
}
