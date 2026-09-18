import type { ExecutableConnector } from "../core/connector";
import type { ConnectorContext } from "../core/connector-context";
import type { ConnectorEvent } from "../core/connector-event";
import type { ConnectorResult } from "../core/connector-result";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { CredentialStore } from "@/lib/connections/credential-store";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { MakeConnectorAdapter } from "./adapter";
import { MAKE_CAPABILITIES } from "./definition";
import type { MakeScenarioInvocation } from "./types";

/**
 * Executable Make connector used by the generic ConnectorEngine.
 * Workspace authorization remains enforced by MakeCapabilityExecutor before
 * an event reaches this provider boundary.
 */
export class MakeExecutableConnector implements ExecutableConnector {
  public readonly id = "make";
  public readonly name = "Make";
  public readonly version = "2.0.0";
  public readonly capabilities = [MAKE_CAPABILITIES.SCENARIO_EXECUTE];

  public constructor(
    public readonly context: ConnectorContext,
    private readonly connectionId: string,
    public enabled = true,
    private readonly adapter = new MakeConnectorAdapter(
      new ConnectionResolver(new DatabaseConnectionRepository(), new CredentialStore()),
    ),
  ) {}

  public async execute(event: ConnectorEvent): Promise<ConnectorResult> {
    if (event.capability !== MAKE_CAPABILITIES.SCENARIO_EXECUTE) {
      throw new Error(`Unsupported Make capability: ${event.capability}.`);
    }
    const result = await this.adapter.execute(this.connectionId, {
      capability: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
      input: event.payload as MakeScenarioInvocation,
    });
    return {
      success: true,
      capability: event.capability,
      data: result.data,
      message: "Make scenario executed successfully.",
      completedAt: new Date(),
    };
  }
}
