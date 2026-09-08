export type PartnerType = "referrer" | "reseller" | "integrator";
export type PartnerStatus = "pending" | "active" | "paused" | "closed";
export type ReferralStatus = "captured" | "qualified" | "converted" | "lost";
export type DealStatus = "lead" | "qualified" | "proposal" | "won" | "lost";
export type CommissionStatus = "draft" | "approved" | "payable" | "paid" | "cancelled";
export type CommissionModel = "percentage" | "fixed";

export interface Partner { id: string; workspaceId: string; name: string; legalName?: string; email: string; type: PartnerType; status: PartnerStatus; referralCode: string; defaultCommissionRuleId?: string; createdAt: string; updatedAt: string; }
export interface Referral { id: string; workspaceId: string; partnerId: string; referralCode: string; contactId?: string; email?: string; status: ReferralStatus; capturedAt: string; convertedAt?: string; metadata?: Record<string, string | number | boolean | null>; }
export interface Deal { id: string; workspaceId: string; partnerId?: string; referralId?: string; contactId?: string; offerId: string; status: DealStatus; currency: string; amountCents: number; recurringInterval?: "month" | "year"; wonAt?: string; createdAt: string; updatedAt: string; }
export interface CommissionRule { id: string; workspaceId: string; name: string; model: CommissionModel; percentageBps?: number; fixedAmountCents?: number; recurringMonths?: number; active: boolean; createdAt: string; updatedAt: string; }
export interface Commission { id: string; workspaceId: string; partnerId: string; dealId: string; ruleId: string; status: CommissionStatus; currency: string; sourceAmountCents: number; amountCents: number; periodIndex: number; createdAt: string; approvedAt?: string; paidAt?: string; }
export interface PartnerAuditEvent { id: string; workspaceId: string; actorId: string; action: string; entityType: "partner" | "referral" | "deal" | "commission" | "commission_rule"; entityId: string; createdAt: string; details?: Record<string, string | number | boolean | null>; }

/** Generic store alias retained so persistence code can stay decoupled from UI naming. */
export type AuditEvent = PartnerAuditEvent;
