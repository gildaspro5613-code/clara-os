export const NOTIFY_TEAM_CAPABILITY_ID = "notify-team" as const;

const parameters = {
  message: {
    type: "string",
    description: "Message to send to the configured team notification destination.",
    required: true,
  },
  title: {
    type: "string",
    description: "Optional short title for the team notification.",
    required: false,
  },
  urgency: {
    type: "string",
    description: "Optional urgency hint: low, normal, high.",
    required: false,
  },
};

export type NotifyTeamCapability = {
  readonly id: typeof NOTIFY_TEAM_CAPABILITY_ID;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
  readonly inputSchema: typeof parameters;
};

/**
 * Provider-neutral POC capability.
 * The Brain sees a Clara capability, not the Make implementation behind it.
 */
export const NotifyTeamCapabilityDefinition: NotifyTeamCapability = {
  id: NOTIFY_TEAM_CAPABILITY_ID,
  name: "Notify team",
  description: "Sends an approved operational notification to the configured team destination.",
  version: "1.0.0",
  category: "Communication",
  inputSchema: parameters,
};
