import type { ConnectorDefinition } from "../core/connector";

export const MAKE_CAPABILITIES = {
  SCENARIO_PREPARE: "make.scenario.prepare",
  SCENARIO_EXECUTE: "make.scenario.execute",
  DRIVE_FIND: "make.drive.find",
  CALENDAR_AVAILABILITY: "make.calendar.availability.read",
  CALENDAR_SEARCH: "make.calendar.events.search",
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
    {
      id: MAKE_CAPABILITIES.DRIVE_FIND,
      operationType: "READ",
      description: "Read-only named file or folder search via approved Make scenario; optionally constrain a file search to a previously found folder. No other scenario or WRITE/SEND.",
    },
    {
      id: MAKE_CAPABILITIES.CALENDAR_AVAILABILITY,
      operationType: "READ",
      description: "Read busy ranges of the explicitly bound Calendar through the fixed approved Make scenario. No WRITE/SEND or calendar selection from chat.",
    },
    {
      id: MAKE_CAPABILITIES.CALENDAR_SEARCH,
      operationType: "READ",
      description: "Search the explicitly bound Calendar through the fixed approved Make scenario. Results may be incomplete; never infer availability from event search.",
    },
  ],
};
