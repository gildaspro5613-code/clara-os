import type { Connector } from "../core/connector";
import type { ConnectorContext } from "../core/connector-context";
import type { ConnectorEvent } from "../core/connector-event";
import type { ConnectorResult } from "../core/connector-result";
import { authorizeClaraLiveExecution } from "./execution-authority";

export const CLARA_LIVE_PHYSICAL_CAPABILITIES = [
  "clara.live.connector.execute",
] as const;

interface PhysicalExecutionPayload {
  agentId: string;
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  sessionId: string;
  operatorAuthorized: true;
}

function executionPayload(value: unknown): PhysicalExecutionPayload {
  if (!value || typeof value !== "object") throw new Error("Physical execution payload is required.");
  const item = value as Partial<PhysicalExecutionPayload>;
  if (item.operatorAuthorized !== true) throw new Error("Explicit operator authorization is required.");
  for (const key of ["agentId", "connector", "capability", "sessionId"] as const) {
    if (typeof item[key] !== "string" || !item[key]!.trim()) throw new Error(`${key} is required.`);
  }
  if (!item.parameters || typeof item.parameters !== "object" || Array.isArray(item.parameters)) {
    throw new Error("parameters must be an object.");
  }
  return item as PhysicalExecutionPayload;
}

/**
 * Clara OS authority adapter for professional Clara Live hardware operations.
 * It never talks to equipment directly.
 */
export class ClaraLivePhysicalConnector implements Connector {
  public readonly id = "clara-live-physical";
  public readonly name = "Clara Live Physical Execution";
  public readonly version = "1.0.0";
  public readonly capabilities: string[] = [...CLARA_LIVE_PHYSICAL_CAPABILITIES];

  public constructor(
    public readonly context: ConnectorContext,
    public enabled = true,
  ) {}

  public async execute(event: ConnectorEvent): Promise<ConnectorResult> {
    if (event.capability !== "clara.live.connector.execute") {
      throw new Error(`Unsupported Clara Live physical capability: ${event.capability}.`);
    }

    const payload = executionPayload(event.payload);
    const receipt = await authorizeClaraLiveExecution({
      agentId: payload.agentId,
      connector: payload.connector,
      capability: payload.capability,
      parameters: payload.parameters,
      sessionId: payload.sessionId,
    });

    return {
      success: true,
      capability: event.capability,
      data: receipt,
      message: "Physical command authorized by Clara OS and queued for Connector Runtime.",
      completedAt: new Date(),
    };
  }
}
