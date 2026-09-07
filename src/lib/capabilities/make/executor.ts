import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionResolver, ConnectionResolutionError } from "@/lib/connections/connection-resolver";
import { CredentialStore } from "@/lib/connections/credential-store";
import {
  MakeConnectorAdapter,
  MakeWebhookError,
  MAKE_CAPABILITIES,
  type MakeCapabilityInput,
  type MakeCapabilityResult,
  type MakeScenarioExecutionResult,
} from "@/lib/connectors/make";
import type { OperationalCapabilityResult } from "../operational-result";
import { isMakeScenarioAllowed } from "./scenario-catalog";

export interface MakeExecutionContext {
  readonly scenarioKey: string;
  readonly payload?: Record<string, unknown>;
}

export interface MakeExecutionAdapter {
  execute(connectionId: string, request: MakeCapabilityInput): Promise<MakeCapabilityResult>;
}

async function defaultAdapter(): Promise<MakeExecutionAdapter> {
  const repository = new DatabaseConnectionRepository();
  return new MakeConnectorAdapter(
    new ConnectionResolver(repository, new CredentialStore()),
  );
}

/**
 * Provider-neutral execution boundary for Make-backed capabilities.
 * Runtime/Autonomy Gate authorization must happen before this executor is called.
 */
export class MakeCapabilityExecutor {
  constructor(
    private readonly connections: ConnectionRepository = new DatabaseConnectionRepository(),
    private readonly adapterFactory: () => MakeExecutionAdapter | Promise<MakeExecutionAdapter> = defaultAdapter,
  ) {}

  async execute(
    capabilityId: string,
    workspaceId: string | undefined,
    context: unknown,
  ): Promise<OperationalCapabilityResult> {
    if (
      capabilityId !== MAKE_CAPABILITIES.SCENARIO_PREPARE &&
      capabilityId !== MAKE_CAPABILITIES.SCENARIO_EXECUTE
    ) {
      return this.failure(capabilityId, undefined, "UNSUPPORTED_CAPABILITY", "This execution path supports Make scenario capabilities only.");
    }

    const candidate = context as Partial<MakeExecutionContext> | null;
    const scenarioKey = typeof candidate?.scenarioKey === "string" ? candidate.scenarioKey.trim() : "";
    if (!scenarioKey) {
      return this.failure(capabilityId, undefined, "SCENARIO_KEY_REQUIRED", "A Make scenario key is required.");
    }

    if (capabilityId === MAKE_CAPABILITIES.SCENARIO_PREPARE) {
      try {
        const adapter = await this.adapterFactory();
        const result = await adapter.execute("not-required", {
          capability: MAKE_CAPABILITIES.SCENARIO_PREPARE,
          input: { scenarioKey, payload: candidate?.payload ?? {} },
        });
        return {
          capabilityId,
          success: true,
          provider: "make",
          status: "completed",
          data: result.data,
        };
      } catch {
        return this.failure(capabilityId, undefined, "MAKE_PREPARE_FAILED", "Make could not prepare the scenario invocation.");
      }
    }

    const normalizedWorkspaceId = workspaceId?.trim() ?? "";
    if (!normalizedWorkspaceId) {
      return this.failure(capabilityId, undefined, "WORKSPACE_REQUIRED", "Workspace identity is required for Make execution.");
    }

    const connection = await this.connections.findByWorkspaceAndProvider(normalizedWorkspaceId, "make");
    if (!connection) {
      return this.failure(capabilityId, undefined, "CONNECTION_REQUIRED", "Make is not configured for this Clara OS workspace.");
    }

    if (!isMakeScenarioAllowed(connection.scopes, scenarioKey)) {
      return this.failure(capabilityId, connection.id, "SCENARIO_NOT_ALLOWED", "This Make scenario is not authorized for the workspace.");
    }

    try {
      const adapter = await this.adapterFactory();
      const result = await adapter.execute(connection.id, {
        capability: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
        input: { scenarioKey, payload: candidate?.payload ?? {} },
      });
      const data = result.data as MakeScenarioExecutionResult;
      return {
        capabilityId,
        success: true,
        provider: "make",
        connectionId: connection.id,
        status: data.executionStatus,
        executionId: data.executionId,
        data,
      };
    } catch (error) {
      if (error instanceof ConnectionResolutionError) {
        return this.failure(capabilityId, connection.id, error.code, "The Make connection is unavailable or incompatible.");
      }
      if (error instanceof MakeWebhookError) {
        return this.failure(capabilityId, connection.id, error.code, error.message, error.retryable);
      }
      return this.failure(capabilityId, connection.id, "MAKE_EXECUTION_FAILED", "Make could not complete the scenario execution.");
    }
  }

  private failure(
    capabilityId: string,
    connectionId: string | undefined,
    code: string,
    message: string,
    retryable = false,
  ): OperationalCapabilityResult {
    return {
      capabilityId,
      success: false,
      provider: "make",
      connectionId,
      status: "failed",
      error: { code, message, retryable },
    };
  }
}
