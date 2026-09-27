import type { AuthenticatedOperator } from "@/lib/core/authenticated-operator";
import type { AuthorizedPhysicalAction } from "./physical-action";
import type {
  PhysicalActionProposalStore,
  StoredPhysicalActionProposal,
} from "./physical-action-store";
import {
  authorizeApprovedPhysicalAction,
  type OperatorApproval,
} from "./operator-approval";

export interface PhysicalActionApprovalContext {
  ownerId: string;
  conversationId: string;
}

function assertApprovalScope(
  proposal: StoredPhysicalActionProposal,
  operator: AuthenticatedOperator,
  context: PhysicalActionApprovalContext,
): void {
  if (proposal.ownerId !== operator.id || context.ownerId !== operator.id) {
    throw new Error("physical action proposal owner does not match authenticated operator");
  }
  if (proposal.conversationId !== context.conversationId) {
    throw new Error("physical action proposal conversation does not match approval context");
  }
}

/**
 * Consumes and authorizes exactly one stored physical proposal.
 *
 * Scope checks happen before consumption so a request from the wrong owner or
 * conversation cannot invalidate the legitimate operator's proposal. The
 * consume result is then treated as the authoritative one-shot value.
 */
export async function consumeApprovedPhysicalAction(
  store: PhysicalActionProposalStore,
  approval: OperatorApproval,
  operator: AuthenticatedOperator,
  context: PhysicalActionApprovalContext,
): Promise<AuthorizedPhysicalAction> {
  const candidate = await store.get(approval.proposalId);
  if (!candidate) throw new Error("physical action proposal is missing or expired");

  assertApprovalScope(candidate, operator, context);

  const consumed = await store.consume(approval.proposalId);
  if (!consumed) throw new Error("physical action proposal was already consumed or expired");

  // Re-check the authoritative consumed value in case a durable implementation
  // changed between read and atomic consume.
  assertApprovalScope(consumed, operator, context);

  return authorizeApprovedPhysicalAction(consumed, approval, operator);
}
