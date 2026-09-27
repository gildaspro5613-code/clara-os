import type { PhysicalActionProposal, AuthorizedPhysicalAction } from "./physical-action";
import { authorizePhysicalAction } from "./physical-action";
import {
  requireAuthenticatedOperator,
  type AuthenticatedOperator,
} from "@/lib/core/authenticated-operator";

export interface OperatorApproval {
  proposalId: string;
  approved: true;
  confirmedAt: Date;
}

/**
 * Converts a proposal to AUTHORIZED only when an explicit approval is paired
 * with an operator identity supplied by a trusted server-side auth boundary.
 * Conversational text and client-supplied actor IDs are not authentication.
 */
export function authorizeApprovedPhysicalAction(
  proposal: PhysicalActionProposal,
  approval: OperatorApproval,
  operator: AuthenticatedOperator | null | undefined,
): AuthorizedPhysicalAction {
  const authenticatedOperator = requireAuthenticatedOperator(operator);

  if (approval.approved !== true) {
    throw new Error("explicit operator approval is required");
  }
  if (approval.proposalId !== proposal.id) {
    throw new Error("approval does not match physical action proposal");
  }
  if (!(approval.confirmedAt instanceof Date) || Number.isNaN(approval.confirmedAt.getTime())) {
    throw new Error("valid confirmation timestamp is required");
  }

  return authorizePhysicalAction(proposal, authenticatedOperator.id);
}
