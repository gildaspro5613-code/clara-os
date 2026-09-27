import type { ConnectorContext } from "../core/connector-context";
import { ConnectorEngine } from "../core/connector-engine";
import { ClaraLivePhysicalConnector } from "./clara-live-physical-connector";
import type { AuthorizedPhysicalAction } from "./physical-action";

/**
 * The only Clara OS path from an authorized Brain action to Clara Live
 * physical execution. PROPOSED actions are intentionally not accepted.
 */
export async function executeAuthorizedPhysicalAction(
  action: AuthorizedPhysicalAction,
  context: ConnectorContext,
) {
  if (action.status !== "AUTHORIZED") {
    throw new Error("Physical action must be explicitly authorized.");
  }

  const engine = new ConnectorEngine();
  const connector = new ClaraLivePhysicalConnector(context);

  return engine.execute(connector, {
    id: action.id,
    capability: "clara.live.connector.execute",
    payload: {
      agentId: action.agentId,
      connector: action.connector,
      capability: action.capability,
      parameters: action.parameters,
      sessionId: action.sessionId,
      operatorAuthorized: true,
    },
    source: "clara-brain-authorized-action",
    receivedAt: new Date(),
  });
}
