import type { PhysicalActionProposal } from "@/lib/connectors/clara-live/physical-action";

export interface PhysicalActionProposalView {
  id: string;
  status: "PROPOSED";
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  sessionId: string;
  confirmation: {
    required: true;
    enabled: false;
    reason: "EXPLICIT_OPERATOR_APPROVAL_REQUIRED";
  };
  execution: {
    commandSent: false;
    physicalExecutionConfirmed: false;
  };
}

/**
 * Safe client projection. A proposal is never presented as queued, sent or
 * physically confirmed before the authenticated authorization boundary.
 */
export function toPhysicalActionProposalView(
  action: PhysicalActionProposal,
): PhysicalActionProposalView {
  return {
    id: action.id,
    status: "PROPOSED",
    connector: action.connector,
    capability: action.capability,
    parameters: action.parameters,
    sessionId: action.sessionId,
    confirmation: {
      required: true,
      enabled: false,
      reason: "EXPLICIT_OPERATOR_APPROVAL_REQUIRED",
    },
    execution: {
      commandSent: false,
      physicalExecutionConfirmed: false,
    },
  };
}
