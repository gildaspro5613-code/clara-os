import { COMMERCIAL_EMAIL_SEND_CAPABILITY } from "@/lib/acquisition/commercial-communication-service";

export interface CommercialEmailCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, {
    type: string;
    description: string;
    required: boolean;
  }>;
}

export const CommercialEmailSendCapabilityDefinition: CommercialEmailCapability = {
  id: COMMERCIAL_EMAIL_SEND_CAPABILITY,
  name: "Validate Mélodie Digital commercial email",
  description: "Crosses the governed commercial-email boundary after explicit approval. It fails closed when the IONOS transport is not configured.",
  inputSchema: {
    workspaceId: { type: "string", description: "Authenticated acquisition workspace.", required: true },
    submissionId: { type: "string", description: "Acquisition submission owning the draft.", required: true },
    sessionKey: { type: "string", description: "Durable Clara session owning the mission.", required: true },
    missionId: { type: "string", description: "Current operational mission.", required: false },
    recipientEmail: { type: "string", description: "Recipient bound to the approved draft.", required: true },
    draftRevision: { type: "number", description: "Immutable draft revision presented for approval.", required: true },
  },
};
