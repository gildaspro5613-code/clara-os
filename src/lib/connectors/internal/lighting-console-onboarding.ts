import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  GRANDMA3_CONNECTOR_ID,
} from "./ma-lighting/grandma3";
import {
  type GrandMA3ConnectionConfigurationRepository,
  validateGrandMA3ConnectionConfiguration,
} from "./ma-lighting/grandma3/connection";
import {
  AVOLITES_TITAN_CONNECTOR_ID,
  AVOLITES_TITAN_WEBAPI_DEFAULT_PORT,
} from "./avolites/titan";
import {
  type TitanConnectionConfigurationRepository,
  validateTitanConnectionConfiguration,
} from "./avolites/titan/connection";

export type LightingConsoleOnboardingProvider =
  | typeof GRANDMA3_CONNECTOR_ID
  | typeof AVOLITES_TITAN_CONNECTOR_ID;

export type LightingConsoleOnboardingRequirement =
  | "OSC_INPUT_CONFIGURED"
  | "OSC_RECEIVE_COMMAND_ENABLED"
  | "OSC_TRANSPORT_AND_PORT_MATCH"
  | "TITAN_WEBAPI_REACHABLE";

export type LightingConsoleOnboardingPlan =
  | {
      provider: typeof GRANDMA3_CONNECTOR_ID;
      workspaceId: string;
      connectionId: string;
      host: string;
      port: number;
      mappedFixtureCount: number;
      connectionTestAvailable: false;
      writeCapabilitiesEnabled: false;
      requirements: readonly [
        "OSC_INPUT_CONFIGURED",
        "OSC_RECEIVE_COMMAND_ENABLED",
        "OSC_TRANSPORT_AND_PORT_MATCH",
      ];
    }
  | {
      provider: typeof AVOLITES_TITAN_CONNECTOR_ID;
      workspaceId: string;
      connectionId: string;
      host: string;
      port: number;
      connectionTestAvailable: true;
      writeCapabilitiesEnabled: false;
      requirements: readonly ["TITAN_WEBAPI_REACHABLE"];
    };

export class LightingConsoleOnboardingReadinessError extends Error {
  constructor(public readonly code:
    | "CONNECTION_NOT_FOUND"
    | "CONNECTION_WORKSPACE_MISMATCH"
    | "CONNECTION_INACTIVE"
    | "PROVIDER_NOT_SUPPORTED"
    | "CONFIGURATION_NOT_FOUND") {
    super(code);
    this.name = "LightingConsoleOnboardingReadinessError";
  }
}

/**
 * Offline, fail-closed planning boundary for Clara Live self-service onboarding.
 * This class performs no network operation and never claims physical connectivity.
 */
export class LightingConsoleSelfServiceOnboardingPlanner {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly grandMA3Configurations: GrandMA3ConnectionConfigurationRepository,
    private readonly titanConfigurations: TitanConnectionConfigurationRepository,
  ) {}

  async plan(input: {
    workspaceId: string;
    connectionId: string;
  }): Promise<LightingConsoleOnboardingPlan> {
    const workspaceId = input.workspaceId.trim();
    const connectionId = input.connectionId.trim();
    if (!workspaceId || !connectionId) {
      throw new TypeError("Lighting onboarding workspace and connection ids must be non-empty.");
    }

    const connection = await this.connections.findById(connectionId);
    if (!connection) throw new LightingConsoleOnboardingReadinessError("CONNECTION_NOT_FOUND");
    if (connection.workspaceId !== workspaceId) {
      throw new LightingConsoleOnboardingReadinessError("CONNECTION_WORKSPACE_MISMATCH");
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new LightingConsoleOnboardingReadinessError("CONNECTION_INACTIVE");
    }

    switch (connection.provider) {
      case GRANDMA3_CONNECTOR_ID: {
        const configuration = await this.grandMA3Configurations.findByConnectionId(connectionId);
        if (!configuration) {
          throw new LightingConsoleOnboardingReadinessError("CONFIGURATION_NOT_FOUND");
        }
        const normalized = validateGrandMA3ConnectionConfiguration(configuration);
        return {
          provider: GRANDMA3_CONNECTOR_ID,
          workspaceId,
          connectionId,
          host: normalized.host,
          port: normalized.port,
          mappedFixtureCount: Object.keys(normalized.fixtureNumbers).length,
          connectionTestAvailable: false,
          writeCapabilitiesEnabled: false,
          requirements: [
            "OSC_INPUT_CONFIGURED",
            "OSC_RECEIVE_COMMAND_ENABLED",
            "OSC_TRANSPORT_AND_PORT_MATCH",
          ],
        };
      }
      case AVOLITES_TITAN_CONNECTOR_ID: {
        const configuration = await this.titanConfigurations.findByConnectionId(connectionId);
        if (!configuration) {
          throw new LightingConsoleOnboardingReadinessError("CONFIGURATION_NOT_FOUND");
        }
        const normalized = validateTitanConnectionConfiguration(configuration);
        return {
          provider: AVOLITES_TITAN_CONNECTOR_ID,
          workspaceId,
          connectionId,
          host: normalized.host,
          port: normalized.port ?? AVOLITES_TITAN_WEBAPI_DEFAULT_PORT,
          connectionTestAvailable: true,
          writeCapabilitiesEnabled: false,
          requirements: ["TITAN_WEBAPI_REACHABLE"],
        };
      }
      default:
        throw new LightingConsoleOnboardingReadinessError("PROVIDER_NOT_SUPPORTED");
    }
  }
}
