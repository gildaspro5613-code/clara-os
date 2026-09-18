import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectorEngine } from "@/lib/connectors/core/connector-engine";
import type { ConnectorContext } from "@/lib/connectors/core/connector-context";
import { MAKE_CAPABILITIES, MakeExecutableConnector, type MakeScenarioExecutionResult } from "@/lib/connectors/make";
import type { OperationalCapabilityResult } from "../operational-result";
import { isMakeScenarioAllowed } from "./scenario-catalog";

export interface MakeExecutionContext {
  readonly scenarioKey: string;
  readonly payload?: Record<string, unknown>;
}

const FORBIDDEN_SCENARIO_KEYS = new Set(["__proto__", "prototype", "constructor"]);
function validScenarioKey(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,120}$/.test(value) && !FORBIDDEN_SCENARIO_KEYS.has(value.toLowerCase());
}

/** Provider-neutral execution boundary for Make-backed capabilities. */
export class MakeCapabilityExecutor {
  constructor(
    private readonly connections: ConnectionRepository = new DatabaseConnectionRepository(),
    private readonly connectorEngine = new ConnectorEngine(),
  ) {}

  async execute(capabilityId: string, workspaceId: string | undefined, context: unknown): Promise<OperationalCapabilityResult> {
    if (capabilityId !== MAKE_CAPABILITIES.SCENARIO_PREPARE && capabilityId !== MAKE_CAPABILITIES.SCENARIO_EXECUTE) {
      return this.failure(capabilityId, undefined, "UNSUPPORTED_CAPABILITY", "This execution path supports Make scenario capabilities only.");
    }

    const candidate = context as Partial<MakeExecutionContext> | null;
    const scenarioKey = typeof candidate?.scenarioKey === "string" ? candidate.scenarioKey.trim() : "";
    if (!validScenarioKey(scenarioKey)) {
      return this.failure(capabilityId, undefined, "INVALID_SCENARIO_KEY", "A valid Make scenario key is required.");
    }

    const normalizedWorkspaceId = workspaceId?.trim() ?? "";
    if (!normalizedWorkspaceId) {
      return this.failure(capabilityId, undefined, "WORKSPACE_REQUIRED", "Workspace identity is required for Make execution.");
    }

    const connection = await this.connections.findByWorkspaceAndProvider(normalizedWorkspaceId, "make");
    if (!connection) {
      return this.failure(capabilityId, undefined, "CONNECTION_REQUIRED", "Make is not configured for this Clara OS workspace.");
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      return this.failure(capabilityId, connection.id, "CONNECTION_NOT_ACTIVE", "The Make connection must be active before preparing or executing scenarios.");
    }
    if (!isMakeScenarioAllowed(connection.scopes, scenarioKey)) {
      return this.failure(capabilityId, connection.id, "SCENARIO_NOT_ALLOWED", "This Make scenario is not explicitly authorized for the workspace.");
    }

    if (capabilityId === MAKE_CAPABILITIES.SCENARIO_PREPARE) {
      return {
        capabilityId,
        success: true,
        provider: "make",
        connectionId: connection.id,
        status: "completed",
        data: { prepared: true, scenarioKey, payload: candidate?.payload ?? {} },
      };
    }

    const connectorContext: ConnectorContext = {
      brain: {} as ConnectorContext["brain"],
      experiences: [],
      recommendations: [],
      configuration: { workspaceId: normalizedWorkspaceId },
      createdAt: new Date(),
    };
    const connector = new MakeExecutableConnector(connectorContext, connection.id);
    const result = await this.connectorEngine.execute(connector, {
      id: crypto.randomUUID(),
      capability: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
      payload: { scenarioKey, payload: candidate?.payload ?? {} },
      source: "capability-engine",
      receivedAt: new Date(),
    });

    if (!result.success) {
      return this.failure(capabilityId, connection.id, "MAKE_EXECUTION_FAILED", result.error ?? result.message ?? "Make could not complete the scenario execution.");
    }

    const data = result.data as MakeScenarioExecutionResult;
    return {
      capabilityId,
      success: true,
      provider: "make",
      connectionId: connection.id,
      status: data.executionStatus ?? "completed",
      executionId: data.executionId,
      data,
    };
  }

  private failure(capabilityId: string, connectionId: string | undefined, code: string, message: string, retryable = false): OperationalCapabilityResult {
    return { capabilityId, success: false, provider: "make", connectionId, status: "failed", error: { code, message, retryable } };
  }
}
