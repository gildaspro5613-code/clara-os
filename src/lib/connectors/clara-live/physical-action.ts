/**
 * A structured physical action proposed by Clara's Brain.
 *
 * Proposal and execution are deliberately separate: a proposed action cannot
 * reach hardware until Clara OS records explicit operator authorization.
 */
export interface PhysicalActionProposal {
  id: string;
  taskId: string;
  agentId: string;
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  sessionId: string;
  status: "PROPOSED";
  proposedAt: Date;
}

export interface AuthorizedPhysicalAction extends Omit<PhysicalActionProposal, "status"> {
  status: "AUTHORIZED";
  authorizedAt: Date;
  authorizedBy: string;
}

export function proposePhysicalAction(
  input: Omit<PhysicalActionProposal, "id" | "status" | "proposedAt">,
): PhysicalActionProposal {
  return {
    ...input,
    id: crypto.randomUUID(),
    status: "PROPOSED",
    proposedAt: new Date(),
  };
}

export function authorizePhysicalAction(
  proposal: PhysicalActionProposal,
  authorizedBy: string,
): AuthorizedPhysicalAction {
  const actor = authorizedBy.trim();
  if (!actor) throw new Error("authorizedBy is required.");
  return {
    ...proposal,
    status: "AUTHORIZED",
    authorizedAt: new Date(),
    authorizedBy: actor,
  };
}
