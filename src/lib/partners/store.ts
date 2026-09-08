import type { AuditEvent, Commission, CommissionRule, Deal, Partner, Referral } from "./types";

export interface PartnerStoreSnapshot {
  partners: Partner[];
  referrals: Referral[];
  deals: Deal[];
  commissionRules: CommissionRule[];
  commissions: Commission[];
  auditEvents: AuditEvent[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function requireWorkspace(workspaceId: string): void {
  if (!workspaceId.trim()) throw new Error("workspaceId is required");
}

export class InMemoryPartnerStore {
  private readonly partners = new Map<string, Partner>();
  private readonly referrals = new Map<string, Referral>();
  private readonly deals = new Map<string, Deal>();
  private readonly commissionRules = new Map<string, CommissionRule>();
  private readonly commissions = new Map<string, Commission>();
  private readonly auditEvents = new Map<string, AuditEvent>();

  savePartner(partner: Partner): Partner {
    requireWorkspace(partner.workspaceId);
    this.partners.set(partner.id, clone(partner));
    return clone(partner);
  }

  getPartner(workspaceId: string, id: string): Partner | null {
    requireWorkspace(workspaceId);
    const partner = this.partners.get(id);
    return partner?.workspaceId === workspaceId ? clone(partner) : null;
  }

  listPartners(workspaceId: string): Partner[] {
    requireWorkspace(workspaceId);
    return [...this.partners.values()].filter((item) => item.workspaceId === workspaceId).map(clone);
  }

  saveReferral(referral: Referral): Referral {
    requireWorkspace(referral.workspaceId);
    const partner = this.getPartner(referral.workspaceId, referral.partnerId);
    if (!partner) throw new Error("referral partner must exist in the same workspace");
    this.referrals.set(referral.id, clone(referral));
    return clone(referral);
  }

  listReferrals(workspaceId: string, partnerId?: string): Referral[] {
    requireWorkspace(workspaceId);
    return [...this.referrals.values()]
      .filter((item) => item.workspaceId === workspaceId && (!partnerId || item.partnerId === partnerId))
      .map(clone);
  }

  saveDeal(deal: Deal): Deal {
    requireWorkspace(deal.workspaceId);
    if (deal.partnerId && !this.getPartner(deal.workspaceId, deal.partnerId)) {
      throw new Error("deal partner must exist in the same workspace");
    }
    this.deals.set(deal.id, clone(deal));
    return clone(deal);
  }

  listDeals(workspaceId: string, partnerId?: string): Deal[] {
    requireWorkspace(workspaceId);
    return [...this.deals.values()]
      .filter((item) => item.workspaceId === workspaceId && (!partnerId || item.partnerId === partnerId))
      .map(clone);
  }

  saveCommissionRule(rule: CommissionRule): CommissionRule {
    requireWorkspace(rule.workspaceId);
    this.commissionRules.set(rule.id, clone(rule));
    return clone(rule);
  }

  listCommissionRules(workspaceId: string): CommissionRule[] {
    requireWorkspace(workspaceId);
    return [...this.commissionRules.values()].filter((item) => item.workspaceId === workspaceId).map(clone);
  }

  saveCommission(commission: Commission): Commission {
    requireWorkspace(commission.workspaceId);
    if (!this.getPartner(commission.workspaceId, commission.partnerId)) {
      throw new Error("commission partner must exist in the same workspace");
    }
    this.commissions.set(commission.id, clone(commission));
    return clone(commission);
  }

  listCommissions(workspaceId: string, partnerId?: string): Commission[] {
    requireWorkspace(workspaceId);
    return [...this.commissions.values()]
      .filter((item) => item.workspaceId === workspaceId && (!partnerId || item.partnerId === partnerId))
      .map(clone);
  }

  appendAuditEvent(event: AuditEvent): AuditEvent {
    requireWorkspace(event.workspaceId);
    if (this.auditEvents.has(event.id)) throw new Error("audit event id already exists");
    this.auditEvents.set(event.id, clone(event));
    return clone(event);
  }

  snapshot(workspaceId: string): PartnerStoreSnapshot {
    return {
      partners: this.listPartners(workspaceId),
      referrals: this.listReferrals(workspaceId),
      deals: this.listDeals(workspaceId),
      commissionRules: this.listCommissionRules(workspaceId),
      commissions: this.listCommissions(workspaceId),
      auditEvents: [...this.auditEvents.values()].filter((item) => item.workspaceId === workspaceId).map(clone),
    };
  }
}
