export const PREPARE_MISSION_DRIVE_CAPABILITY_ID = "prepare-mission-drive" as const;

const parameters = {
  missionId: {
    type: "string",
    description: "Mission identifier whose Drive workspace must be prepared.",
    required: true,
  },
  folderName: {
    type: "string",
    description: "Name of the Drive folder to create for the mission.",
    required: true,
  },
  document: {
    type: "object",
    description: "Optional first document to archive and place inside the mission folder.",
    required: false,
  },
};

export type PrepareMissionDriveCapability = {
  readonly id: typeof PREPARE_MISSION_DRIVE_CAPABILITY_ID;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
  readonly inputSchema: typeof parameters;
};

/**
 * Provider-neutral mission capability.
 * The Brain asks Clara to prepare a mission workspace; Make remains hidden behind Runtime.
 */
export const PrepareMissionDriveCapabilityDefinition: PrepareMissionDriveCapability = {
  id: PREPARE_MISSION_DRIVE_CAPABILITY_ID,
  name: "Prepare mission Drive",
  description: "Creates the mission Drive workspace and can archive the first mission document into it.",
  version: "1.0.0",
  category: "Documents",
  inputSchema: parameters,
};
