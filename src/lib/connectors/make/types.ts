export interface MakeScenarioConfiguration {
  /** Secret Make custom-webhook URL. Stored only in the credential store. */
  url: string;
  /** Optional secret headers required by the scenario gateway. */
  headers?: Record<string, string>;
}

/** Credentials are resolved by connectionId and never supplied by Clara/user input. */
export interface MakeWebhookCredentials {
  scenarios: Record<string, MakeScenarioConfiguration>;
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

export interface MakeScenarioExecutionResult {
  ok: true;
  scenarioKey: string;
  status: number;
  data: unknown;
}
