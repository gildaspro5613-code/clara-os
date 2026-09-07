import { sql } from "@/lib/core/store/database";
import type {
  Commission,
  CommissionRule,
  Deal,
  Partner,
  PartnerAuditEvent,
  Referral,
} from "./types";

export interface PartnerRepository {
  savePartner(partner: Partner): Promise<void>;
  findPartner(workspaceId: string, partnerId: string): Promise<Partner | null>;
  listPartners(workspaceId: string): Promise<Partner[]>;
  saveReferral(referral: Referral): Promise<void>;
  listReferrals(workspaceId: string, partnerId?: string): Promise<Referral[]>;
  saveDeal(deal: Deal): Promise<void>;
  listDeals(workspaceId: string, partnerId?: string): Promise<Deal[]>;
  saveCommissionRule(rule: CommissionRule): Promise<void>;
  listCommissionRules(workspaceId: string): Promise<CommissionRule[]>;
  saveCommission(commission: Commission): Promise<void>;
  listCommissions(workspaceId: string, partnerId?: string): Promise<Commission[]>;
  appendAuditEvent(event: PartnerAuditEvent): Promise<void>;
  listAuditEvents(workspaceId: string): Promise<PartnerAuditEvent[]>;
}

type PartnerRow = {
  id: string; workspace_id: string; name: string; legal_name: string | null;
  email: string; type: Partner["type"]; status: Partner["status"];
  referral_code: string; default_commission_rule_id: string | null;
  created_at: Date | string; updated_at: Date | string;
};
type ReferralRow = {
  id: string; workspace_id: string; partner_id: string; referral_code: string;
  contact_id: string | null; email: string | null; status: Referral["status"];
  captured_at: Date | string; converted_at: Date | string | null;
  metadata: Referral["metadata"] | string | null;
};
type DealRow = {
  id: string; workspace_id: string; partner_id: string | null; referral_id: string | null;
  contact_id: string | null; offer_id: string; status: Deal["status"]; currency: string;
  amount_cents: number; recurring_interval: Deal["recurringInterval"] | null;
  won_at: Date | string | null; created_at: Date | string; updated_at: Date | string;
};
type CommissionRuleRow = {
  id: string; workspace_id: string; name: string; model: CommissionRule["model"];
  percentage_bps: number | null; fixed_amount_cents: number | null;
  recurring_months: number | null; active: boolean;
  created_at: Date | string; updated_at: Date | string;
};
type CommissionRow = {
  id: string; workspace_id: string; partner_id: string; deal_id: string; rule_id: string;
  status: Commission["status"]; currency: string; source_amount_cents: number;
  amount_cents: number; period_index: number; created_at: Date | string;
  approved_at: Date | string | null; paid_at: Date | string | null;
};
type AuditRow = {
  id: string; workspace_id: string; actor_id: string; action: string;
  entity_type: PartnerAuditEvent["entityType"]; entity_id: string;
  created_at: Date | string; details: PartnerAuditEvent["details"] | string | null;
};

const iso = (value: Date | string): string => new Date(value).toISOString();
const optionalIso = (value: Date | string | null): string | undefined => value ? iso(value) : undefined;
function parseJson<T>(value: T | string | null): T | undefined {
  if (value == null) return undefined;
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

function partnerFromRow(row: PartnerRow): Partner {
  return {
    id: row.id, workspaceId: row.workspace_id, name: row.name,
    legalName: row.legal_name ?? undefined, email: row.email, type: row.type,
    status: row.status, referralCode: row.referral_code,
    defaultCommissionRuleId: row.default_commission_rule_id ?? undefined,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}
function referralFromRow(row: ReferralRow): Referral {
  return {
    id: row.id, workspaceId: row.workspace_id, partnerId: row.partner_id,
    referralCode: row.referral_code, contactId: row.contact_id ?? undefined,
    email: row.email ?? undefined, status: row.status, capturedAt: iso(row.captured_at),
    convertedAt: optionalIso(row.converted_at), metadata: parseJson(row.metadata),
  };
}
function dealFromRow(row: DealRow): Deal {
  return {
    id: row.id, workspaceId: row.workspace_id, partnerId: row.partner_id ?? undefined,
    referralId: row.referral_id ?? undefined, contactId: row.contact_id ?? undefined,
    offerId: row.offer_id, status: row.status, currency: row.currency,
    amountCents: row.amount_cents, recurringInterval: row.recurring_interval ?? undefined,
    wonAt: optionalIso(row.won_at), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}
function ruleFromRow(row: CommissionRuleRow): CommissionRule {
  return {
    id: row.id, workspaceId: row.workspace_id, name: row.name, model: row.model,
    percentageBps: row.percentage_bps ?? undefined,
    fixedAmountCents: row.fixed_amount_cents ?? undefined,
    recurringMonths: row.recurring_months ?? undefined, active: row.active,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}
function commissionFromRow(row: CommissionRow): Commission {
  return {
    id: row.id, workspaceId: row.workspace_id, partnerId: row.partner_id,
    dealId: row.deal_id, ruleId: row.rule_id, status: row.status,
    currency: row.currency, sourceAmountCents: row.source_amount_cents,
    amountCents: row.amount_cents, periodIndex: row.period_index,
    createdAt: iso(row.created_at), approvedAt: optionalIso(row.approved_at), paidAt: optionalIso(row.paid_at),
  };
}
function auditFromRow(row: AuditRow): PartnerAuditEvent {
  return {
    id: row.id, workspaceId: row.workspace_id, actorId: row.actor_id,
    action: row.action, entityType: row.entity_type, entityId: row.entity_id,
    createdAt: iso(row.created_at), details: parseJson(row.details),
  };
}

export class DatabasePartnerRepository implements PartnerRepository {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`CREATE TABLE IF NOT EXISTS clara_partners (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, name TEXT NOT NULL,
      legal_name TEXT, email TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL,
      referral_code TEXT NOT NULL, default_commission_rule_id TEXT,
      created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE (workspace_id, referral_code)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS clara_partners_workspace_idx ON clara_partners(workspace_id)`;
    await sql`CREATE TABLE IF NOT EXISTS clara_partner_referrals (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, partner_id TEXT NOT NULL REFERENCES clara_partners(id),
      referral_code TEXT NOT NULL, contact_id TEXT, email TEXT, status TEXT NOT NULL,
      captured_at TIMESTAMPTZ NOT NULL, converted_at TIMESTAMPTZ, metadata JSONB
    )`;
    await sql`CREATE INDEX IF NOT EXISTS clara_partner_referrals_workspace_idx ON clara_partner_referrals(workspace_id, partner_id)`;
    await sql`CREATE TABLE IF NOT EXISTS clara_partner_deals (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, partner_id TEXT REFERENCES clara_partners(id),
      referral_id TEXT REFERENCES clara_partner_referrals(id), contact_id TEXT, offer_id TEXT NOT NULL,
      status TEXT NOT NULL, currency TEXT NOT NULL, amount_cents BIGINT NOT NULL,
      recurring_interval TEXT, won_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS clara_partner_deals_workspace_idx ON clara_partner_deals(workspace_id, partner_id)`;
    await sql`CREATE TABLE IF NOT EXISTS clara_partner_commission_rules (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, name TEXT NOT NULL, model TEXT NOT NULL,
      percentage_bps INTEGER, fixed_amount_cents BIGINT, recurring_months INTEGER,
      active BOOLEAN NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS clara_partner_rules_workspace_idx ON clara_partner_commission_rules(workspace_id)`;
    await sql`CREATE TABLE IF NOT EXISTS clara_partner_commissions (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, partner_id TEXT NOT NULL REFERENCES clara_partners(id),
      deal_id TEXT NOT NULL REFERENCES clara_partner_deals(id), rule_id TEXT NOT NULL REFERENCES clara_partner_commission_rules(id),
      status TEXT NOT NULL, currency TEXT NOT NULL, source_amount_cents BIGINT NOT NULL,
      amount_cents BIGINT NOT NULL, period_index INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL, approved_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
      UNIQUE (deal_id, rule_id, period_index)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS clara_partner_commissions_workspace_idx ON clara_partner_commissions(workspace_id, partner_id)`;
    await sql`CREATE TABLE IF NOT EXISTS clara_partner_audit (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, details JSONB
    )`;
    await sql`CREATE INDEX IF NOT EXISTS clara_partner_audit_workspace_idx ON clara_partner_audit(workspace_id, created_at)`;
    this.initialized = true;
  }

  async savePartner(partner: Partner): Promise<void> {
    await this.initialize();
    await sql`INSERT INTO clara_partners
      (id, workspace_id, name, legal_name, email, type, status, referral_code, default_commission_rule_id, created_at, updated_at)
      VALUES (${partner.id}, ${partner.workspaceId}, ${partner.name}, ${partner.legalName ?? null}, ${partner.email},
        ${partner.type}, ${partner.status}, ${partner.referralCode}, ${partner.defaultCommissionRuleId ?? null}, ${partner.createdAt}, ${partner.updatedAt})
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, legal_name=EXCLUDED.legal_name, email=EXCLUDED.email,
        type=EXCLUDED.type, status=EXCLUDED.status, referral_code=EXCLUDED.referral_code,
        default_commission_rule_id=EXCLUDED.default_commission_rule_id, updated_at=EXCLUDED.updated_at`;
  }

  async findPartner(workspaceId: string, partnerId: string): Promise<Partner | null> {
    await this.initialize();
    const rows = await sql`SELECT * FROM clara_partners WHERE workspace_id=${workspaceId} AND id=${partnerId} LIMIT 1` as PartnerRow[];
    return rows[0] ? partnerFromRow(rows[0]) : null;
  }

  async listPartners(workspaceId: string): Promise<Partner[]> {
    await this.initialize();
    const rows = await sql`SELECT * FROM clara_partners WHERE workspace_id=${workspaceId} ORDER BY created_at DESC` as PartnerRow[];
    return rows.map(partnerFromRow);
  }

  async saveReferral(referral: Referral): Promise<void> {
    await this.initialize();
    await sql`INSERT INTO clara_partner_referrals
      (id, workspace_id, partner_id, referral_code, contact_id, email, status, captured_at, converted_at, metadata)
      VALUES (${referral.id}, ${referral.workspaceId}, ${referral.partnerId}, ${referral.referralCode}, ${referral.contactId ?? null},
        ${referral.email ?? null}, ${referral.status}, ${referral.capturedAt}, ${referral.convertedAt ?? null},
        ${referral.metadata ? JSON.stringify(referral.metadata) : null})
      ON CONFLICT (id) DO UPDATE SET contact_id=EXCLUDED.contact_id, email=EXCLUDED.email, status=EXCLUDED.status,
        converted_at=EXCLUDED.converted_at, metadata=EXCLUDED.metadata`;
  }

  async listReferrals(workspaceId: string, partnerId?: string): Promise<Referral[]> {
    await this.initialize();
    const rows = partnerId
      ? await sql`SELECT * FROM clara_partner_referrals WHERE workspace_id=${workspaceId} AND partner_id=${partnerId} ORDER BY captured_at DESC` as ReferralRow[]
      : await sql`SELECT * FROM clara_partner_referrals WHERE workspace_id=${workspaceId} ORDER BY captured_at DESC` as ReferralRow[];
    return rows.map(referralFromRow);
  }

  async saveDeal(deal: Deal): Promise<void> {
    await this.initialize();
    await sql`INSERT INTO clara_partner_deals
      (id, workspace_id, partner_id, referral_id, contact_id, offer_id, status, currency, amount_cents, recurring_interval, won_at, created_at, updated_at)
      VALUES (${deal.id}, ${deal.workspaceId}, ${deal.partnerId ?? null}, ${deal.referralId ?? null}, ${deal.contactId ?? null},
        ${deal.offerId}, ${deal.status}, ${deal.currency}, ${deal.amountCents}, ${deal.recurringInterval ?? null}, ${deal.wonAt ?? null}, ${deal.createdAt}, ${deal.updatedAt})
      ON CONFLICT (id) DO UPDATE SET partner_id=EXCLUDED.partner_id, referral_id=EXCLUDED.referral_id,
        contact_id=EXCLUDED.contact_id, offer_id=EXCLUDED.offer_id, status=EXCLUDED.status, currency=EXCLUDED.currency,
        amount_cents=EXCLUDED.amount_cents, recurring_interval=EXCLUDED.recurring_interval, won_at=EXCLUDED.won_at, updated_at=EXCLUDED.updated_at`;
  }

  async listDeals(workspaceId: string, partnerId?: string): Promise<Deal[]> {
    await this.initialize();
    const rows = partnerId
      ? await sql`SELECT * FROM clara_partner_deals WHERE workspace_id=${workspaceId} AND partner_id=${partnerId} ORDER BY created_at DESC` as DealRow[]
      : await sql`SELECT * FROM clara_partner_deals WHERE workspace_id=${workspaceId} ORDER BY created_at DESC` as DealRow[];
    return rows.map(dealFromRow);
  }

  async saveCommissionRule(rule: CommissionRule): Promise<void> {
    await this.initialize();
    await sql`INSERT INTO clara_partner_commission_rules
      (id, workspace_id, name, model, percentage_bps, fixed_amount_cents, recurring_months, active, created_at, updated_at)
      VALUES (${rule.id}, ${rule.workspaceId}, ${rule.name}, ${rule.model}, ${rule.percentageBps ?? null},
        ${rule.fixedAmountCents ?? null}, ${rule.recurringMonths ?? null}, ${rule.active}, ${rule.createdAt}, ${rule.updatedAt})
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, model=EXCLUDED.model, percentage_bps=EXCLUDED.percentage_bps,
        fixed_amount_cents=EXCLUDED.fixed_amount_cents, recurring_months=EXCLUDED.recurring_months,
        active=EXCLUDED.active, updated_at=EXCLUDED.updated_at`;
  }

  async listCommissionRules(workspaceId: string): Promise<CommissionRule[]> {
    await this.initialize();
    const rows = await sql`SELECT * FROM clara_partner_commission_rules WHERE workspace_id=${workspaceId} ORDER BY created_at DESC` as CommissionRuleRow[];
    return rows.map(ruleFromRow);
  }

  async saveCommission(commission: Commission): Promise<void> {
    await this.initialize();
    await sql`INSERT INTO clara_partner_commissions
      (id, workspace_id, partner_id, deal_id, rule_id, status, currency, source_amount_cents, amount_cents, period_index, created_at, approved_at, paid_at)
      VALUES (${commission.id}, ${commission.workspaceId}, ${commission.partnerId}, ${commission.dealId}, ${commission.ruleId},
        ${commission.status}, ${commission.currency}, ${commission.sourceAmountCents}, ${commission.amountCents}, ${commission.periodIndex},
        ${commission.createdAt}, ${commission.approvedAt ?? null}, ${commission.paidAt ?? null})
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, approved_at=EXCLUDED.approved_at, paid_at=EXCLUDED.paid_at`;
  }

  async listCommissions(workspaceId: string, partnerId?: string): Promise<Commission[]> {
    await this.initialize();
    const rows = partnerId
      ? await sql`SELECT * FROM clara_partner_commissions WHERE workspace_id=${workspaceId} AND partner_id=${partnerId} ORDER BY created_at DESC` as CommissionRow[]
      : await sql`SELECT * FROM clara_partner_commissions WHERE workspace_id=${workspaceId} ORDER BY created_at DESC` as CommissionRow[];
    return rows.map(commissionFromRow);
  }

  async appendAuditEvent(event: PartnerAuditEvent): Promise<void> {
    await this.initialize();
    await sql`INSERT INTO clara_partner_audit
      (id, workspace_id, actor_id, action, entity_type, entity_id, created_at, details)
      VALUES (${event.id}, ${event.workspaceId}, ${event.actorId}, ${event.action}, ${event.entityType}, ${event.entityId},
        ${event.createdAt}, ${event.details ? JSON.stringify(event.details) : null})`;
  }

  async listAuditEvents(workspaceId: string): Promise<PartnerAuditEvent[]> {
    await this.initialize();
    const rows = await sql`SELECT * FROM clara_partner_audit WHERE workspace_id=${workspaceId} ORDER BY created_at DESC` as AuditRow[];
    return rows.map(auditFromRow);
  }
}
