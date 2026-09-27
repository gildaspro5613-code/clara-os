import type { ConnectorContext } from "../core/connector-context";
import type { ConnectorEvent } from "../core/connector-event";
import { ConnectorEngine } from "../core/connector-engine";
import type { AuthorizedPhysicalAction } from "./physical-action";
import { ClaraLivePhysicalConnector } from "./clara-live-physical-connector";

/**
 * Routes an already-authorized physical action through the canonical Connector
 * Engine. This function cannot authorize a proposal and never talks directly
 * to hardware.
 */
export async function executeAuthorizedPhysicalAction(
  action: AuthorizedPhysicalAction,
  context: ConnectorContext,
) {
  if (action.status !== "AUTHORIZED") {
    throw new Error("physical action must be AUTHORIZED before execution");
  }

  const connector = new ClaraLivePhysicalConnector(context);
  const engine = new ConnectorEngine();
  const event: ConnectorEvent = {
    id: `physical-${action.id}`,
    capability: "clara.live.connector.execute",
    source: "clara-os-authorized-physical-action",
    receivedAt: new Date(),
    payload: {
      agentId: action.agentId,
      connector: action.connector,
      capability: action.capability,
      parameters: action.parameters,
      sessionId: action.sessionId,
      operatorAuthorized: true,
    },
  };

  return engine.execute(connector, event);
}
