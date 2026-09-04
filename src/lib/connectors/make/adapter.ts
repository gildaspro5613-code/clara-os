import type { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { MakeWebhookClient, type MakeFetch } from "./client";
import { MAKE_CAPABILITIES } from "./definition";
import type {
  MakeScenarioInvocation,
  MakeWebhookCredentials,
  PreparedMakeScenarioInvocation,
  MakeScenarioExecutionResult,
} from "./types";

export type MakeCapabilityInput =
  | {
      capability: typeof MAKE_CAPABILITIES.SCENARIO_PREPARE;
      input: MakeScenarioInvocation;
    }
  | {
      capability: typeof MAKE_CAPABILITIES.SCENARIO_EXECUTE;
      input: MakeScenarioInvocation;
    };

export interface MakeCapabilityResult {
  provider: "make";
  capability: MakeCapabilityInput["capability"];
  data: PreparedMakeScenarioInvocation | MakeScenarioExecutionResult;
}

function normalizeInvocation(input: MakeScenarioInvocation): MakeScenarioInvocation {
  const scenarioKey = input.scenarioKey.trim();
  if (!scenarioKey) throw new Error("A Make scenario key is required.");
  return {
    scenarioKey,
    payload: input.payload ?? {},
  };
}

/**
 * Provider adapter invoked only after Runtime/Autonomy Gate authorization.
 * Scenario URLs and secret headers are resolved from the credential store;
 * user/mission input can select only a stable scenarioKey.
 */
export class MakeConnectorAdapter {
  constructor(
    private readonly resolver: ConnectionResolver,
    private readonly fetcher?: MakeFetch,
  ) {}

  async execute(connectionId: string, request: MakeCapabilityInput): Promise<MakeCapabilityResult> {
    const invocation = normalizeInvocation(request.input);

    if (request.capability === MAKE_CAPABILITIES.SCENARIO_PREPARE) {
      return {
        provider: "make",
        capability: request.capability,
        data: {
          prepared: true,
          scenarioKey: invocation.scenarioKey,
          payload: invocation.payload ?? {},
        },
      };
    }

    const { credentials } = await this.resolver.resolve<MakeWebhookCredentials>(connectionId, "make");
    const configuration = credentials.scenarios[invocation.scenarioKey];
    if (!configuration) {
      throw new Error(`Make scenario is not configured: ${invocation.scenarioKey}`);
    }

    const client = new MakeWebhookClient(this.fetcher);
    const data = await client.execute(configuration, invocation);
    return { provider: "make", capability: request.capability, data };
  }
}
