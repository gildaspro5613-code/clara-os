import type { PhysicalActionProposal, AuthorizedPhysicalAction } from "./physical-action";
import { authorizePhysicalAction } from "./physical-action";

export interface OperatorApproval {
  proposalId: string;
  approved: true;
  actorId: string;
  confirmedAt: Date;
}

/**
 * Converts a proposal to AUTHORIZED only from a trusted, authenticated
 * approval record. Conversational text such as "oui" is not an approval.
 */
export function authorizeApprovedPhysicalAction(
  proposal: PhysicalActionProposal,
  approval: OperatorApproval,
): AuthorizedPhysicalAction {
  if (approval.approved !== true) {
    throw new Error("explicit operator approval is required");
  }
  if (!approval.actorId.trim()) {
    throw new Error("authenticated actorId is required");
  }
  if (approval.proposalId !== proposal.id) {
    throw new Error("approval does not match physical action proposal");
  }
  if (!(approval.confirmedAt instanceof Date) || Number.isNaN(approval.confirmedAt.getTime())) {
    throw new Error("valid confirmation timestamp is required");
  }

  return authorizePhysicalAction(proposal, approval.actorId);
}
