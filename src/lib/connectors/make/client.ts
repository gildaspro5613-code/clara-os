import type {
  MakeScenarioConfiguration,
  MakeScenarioExecutionResult,
  MakeScenarioInvocation,
} from "./types";

export type MakeFetch = typeof fetch;

export class MakeWebhookError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
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
    throw new MakeWebhookError("Invalid Make webhook URL.");
  }
  if (url.protocol !== "https:") {
    throw new MakeWebhookError("Make webhook URL must use HTTPS.");
  }
  return url;
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

/** Thin HTTP client for approved Make custom-webhook invocations. */
export class MakeWebhookClient {
  constructor(private readonly fetcher: MakeFetch = fetch) {}

  async execute(
    configuration: MakeScenarioConfiguration,
    invocation: MakeScenarioInvocation,
  ): Promise<MakeScenarioExecutionResult> {
    const url = assertWebhookUrl(configuration.url);
    const response = await this.fetcher(url, {
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
    });

    const data = await readResponse(response);
    if (!response.ok) {
      throw new MakeWebhookError(
        `Make scenario execution failed with status ${response.status}.`,
        response.status,
      );
    }

    return {
      ok: true,
      scenarioKey: invocation.scenarioKey,
      status: response.status,
      data,
    };
  }
}
