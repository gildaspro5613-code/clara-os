import type { ExecutableConnector } from "../core/connector";
import type { ConnectorContext } from "../core/connector-context";
import type { ConnectorEvent } from "../core/connector-event";
import type { ConnectorResult } from "../core/connector-result";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { CredentialStore } from "@/lib/connections/credential-store";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { BrevoConnectorAdapter, type BrevoCapabilityInput } from "./adapter";
import { BREVO_CAPABILITIES } from "./definition";

/** Generic ConnectorEngine boundary for native Brevo capabilities. */
export class BrevoExecutableConnector implements ExecutableConnector {
  public readonly id = "brevo";
  public readonly name = "Brevo";
  public readonly version = "2.0.0";
  public readonly capabilities = Object.values(BREVO_CAPABILITIES);

  public constructor(
    public readonly context: ConnectorContext,
    private readonly connectionId: string,
    public enabled = true,
    private readonly adapter = new BrevoConnectorAdapter(
      new ConnectionResolver(new DatabaseConnectionRepository(), new CredentialStore()),
    ),
  ) {}

  public async execute(event: ConnectorEvent): Promise<ConnectorResult> {
    if (!this.capabilities.includes(event.capability as (typeof this.capabilities)[number])) {
      throw new Error(`Unsupported Brevo capability: ${event.capability}.`);
    }
    const result = await this.adapter.execute(this.connectionId, {
      capability: event.capability,
      input: event.payload,
    } as BrevoCapabilityInput);
    return {
      success: result.success,
      capability: result.capabilityId,
      ...(result.data !== undefined ? { data: result.data } : {}),
      ...(result.error ? { error: result.error.message } : {}),
      ...(result.success ? { message: "Brevo operation completed successfully." } : {}),
      completedAt: new Date(),
    };
  }
}
