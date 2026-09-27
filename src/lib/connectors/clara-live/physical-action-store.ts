import type { PhysicalActionProposal } from "./physical-action";

export interface StoredPhysicalActionProposal extends PhysicalActionProposal {
  ownerId: string;
  conversationId: string;
  expiresAt: Date;
}

export interface PhysicalActionProposalStore {
  create(proposal: StoredPhysicalActionProposal): Promise<void>;
  get(id: string): Promise<StoredPhysicalActionProposal | null>;
  consume(id: string): Promise<StoredPhysicalActionProposal | null>;
}

/**
 * Offline/test implementation with one-time consumption semantics.
 * Production must provide a durable atomic store before approvals are enabled.
 */
export class InMemoryPhysicalActionProposalStore implements PhysicalActionProposalStore {
  private readonly proposals = new Map<string, StoredPhysicalActionProposal>();

  async create(proposal: StoredPhysicalActionProposal): Promise<void> {
    if (this.proposals.has(proposal.id)) throw new Error("physical action proposal already exists");
    this.proposals.set(proposal.id, proposal);
  }

  async get(id: string): Promise<StoredPhysicalActionProposal | null> {
    const proposal = this.proposals.get(id);
    if (!proposal) return null;
    if (proposal.expiresAt.getTime() <= Date.now()) {
      this.proposals.delete(id);
      return null;
    }
    return proposal;
  }

  async consume(id: string): Promise<StoredPhysicalActionProposal | null> {
    const proposal = this.proposals.get(id);
    if (!proposal) return null;
    this.proposals.delete(id);
    if (proposal.expiresAt.getTime() <= Date.now()) return null;
    return proposal;
  }
}
