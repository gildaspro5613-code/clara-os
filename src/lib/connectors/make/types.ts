export interface MakeWebhookScenarioConfiguration {
  /** Secret Make custom-webhook URL. Stored only in the credential store. */
  url: string;
  /** Optional secret headers required by the scenario gateway. */
  headers?: Record<string, string>;
  /** Maximum synchronous wait time; the client applies safe bounds. */
  timeoutMs?: number;
}

/** Existing Make on-demand scenario: no webhook, use the API with explicit ID.
 * API token and regional endpoint are scoped to the encrypted connection only.
 */
export interface MakeOnDemandScenarioConfiguration {
  transport: "api";
  scenarioId: number;
}

export type MakeScenarioConfiguration =
  | (MakeWebhookScenarioConfiguration & { transport?: "webhook" })
  | MakeOnDemandScenarioConfiguration;

export interface MakeApiCredentials {
  /** Bearer-equivalent Make API token, never supplied from chat/tool input. */
  token: string;
  /** Exact Make region e.g. eu1, eu2 or us1. Not an arbitrary URL. */
  zone: string;
}

/** Credentials are resolved by connectionId and never supplied by Clara/user input. */
export interface MakeWebhookCredentials {
  scenarios: Record<string, MakeScenarioConfiguration>;
  /** Optional, only for explicitly registered on-demand API scenarios. */
  api?: MakeApiCredentials;
}

export interface MakeScenarioInvocation {
  /** Stable Clara OS capability/scenario key, not a Make scenario id. */
  scenarioKey: string;
  /** Scenario-specific data contract. Business schemas are added with each scenario. */
  payload?: Record<string, unknown>;
}

export interface PreparedMakeScenarioInvocation {
  prepared: true;
  scenarioKey: string;
  payload: Record<string, unknown>;
}

export type MakeScenarioExecutionStatus = "completed" | "accepted" | "pending";

export interface MakeScenarioExecutionResult {
  ok: true;
  scenarioKey: string;
  status: number;
  executionStatus: MakeScenarioExecutionStatus;
  executionId?: string;
  data: unknown;
}
