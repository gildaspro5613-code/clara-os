import type { ConnectorDefinition } from "../core/connector";

export const MAKE_CAPABILITIES = {
  SCENARIO_PREPARE: "make.scenario.prepare",
  SCENARIO_EXECUTE: "make.scenario.execute",
} as const;

export const MakeConnectorDefinition: ConnectorDefinition = {
  id: "make",
  name: "Make",
  version: "1.0.0",
  authentication: { type: "webhook", credentialReference: "connectionId" },
  capabilities: [
    {
      id: MAKE_CAPABILITIES.SCENARIO_PREPARE,
      operationType: "PREPARE",
      description: "Prepare a typed Make scenario invocation without executing it.",
    },
    {
      id: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
      operationType: "EXECUTE",
      description: "Execute an approved Make scenario through its configured webhook.",
    },
  ],
};
