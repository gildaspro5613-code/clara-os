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
  readonly inputSchema: Record<string,{type:string;description:string;required:boolean}>;
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

// This is a single reviewed READ business scenario. The generic Make execute
// capability remains EXECUTE and is never routed through native READ.
export const MakeDriveFindCapabilityDefinition: MakeScenarioCapability = {
  id: MAKE_CAPABILITIES.DRIVE_FIND,
  name: "Find Drive document through Make",
  description: "Read-only search of Drive using the approved find-drive-document Make scenario.",
  version: "1.0.0",
  category: "Automation",
  inputSchema: {
    query: {
      type: "string",
      description: "Bounded Google Drive document search query (max 200 characters); no scenario key, account ID or secret.",
      required: true,
    },
  },
};
