import { MAKE_CAPABILITIES } from "@/lib/connectors/make";

const parameters = {
  scenarioKey: {
    type: "string",
    description: "Stable Clara scenario key configured for this workspace.",
    required: true,
  },
  payload: {
    type: "object",
    description: "Scenario-specific structured payload.",
    required: false,
  },
};

export type MakeScenarioCapability = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
  readonly inputSchema: typeof parameters;
};

export const MakeScenarioPrepareCapabilityDefinition: MakeScenarioCapability = {
  id: MAKE_CAPABILITIES.SCENARIO_PREPARE,
  name: "Prepare Make scenario",
  description: "Prepares a configured Make scenario without executing it.",
  version: "1.0.0",
  category: "Automation",
  inputSchema: parameters,
};

export const MakeScenarioExecuteCapabilityDefinition: MakeScenarioCapability = {
  id: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
  name: "Execute Make scenario",
  description: "Executes an approved Make scenario configured for this workspace.",
  version: "1.0.0",
  category: "Automation",
  inputSchema: parameters,
};
