import { NextResponse } from "next/server";
import { calculateCommission } from "@/lib/partners/commission-service";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal, isSameOriginRequest } from "@/lib/partners/server-context";
import type { Commission } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ partnerId: string }> };

type CalculateCommissionBody = {
  dealId: string;
  ruleId: string;
  periodIndex: number;
};

function parseBody(value: unknown): CalculateCommissionBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const dealId = typeof body.dealId === "string" ? body.dealId.trim() : "";
  const ruleId = typeof body.ruleId === "string" ? body.ruleId.trim() : "";
  const periodIndex = typeof body.periodIndex === "number" ? body.periodIndex : 1;
  if (!dealId || !ruleId || dealId.length > 160 || ruleId.length > 160) return null;
  if (!Number.isInteger(periodIndex) || periodIndex < 1) return null;
  return { dealId, ruleId, periodIndex };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { partnerId } = await context.params;
    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const partner = await repository.findPartner(principal.workspaceId, partnerId);
    if (!partner) return NextResponse.json({ success: false, error: "Partner not found." }, { status: 404 });
    const commissions = await repository.listCommissions(principal.workspaceId, partner.id);
    return NextResponse.json({ success: true, commissions });
  } catch (error) {
    console.error("[API /partners/:partnerId/commissions GET]", error);
    return NextResponse.json({ success: false, error: "Unable to load commissions." }, { status: 500 });
  }
}

/**
 * PREPARE-only financial operation.
 * It can create a deterministic draft calculation, but it never approves,
 * marks payable or marks paid. Those transitions remain behind Clara's
 * approval/governance layer.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized request origin." }, { status: 403 });
    }
    const { partnerId } = await context.params;
    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const partner = await repository.findPartner(principal.workspaceId, partnerId);
    if (!partner) return NextResponse.json({ success: false, error: "Partner not found." }, { status: 404 });

    let rawBody: unknown;
    try { rawBody = await request.json(); } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
    const body = parseBody(rawBody);
    if (!body) return NextResponse.json({ success: false, error: "Invalid commission calculation request." }, { status: 400 });

    const deals = await repository.listDeals(principal.workspaceId, partner.id);
    const deal = deals.find((item) => item.id === body.dealId);
    if (!deal) return NextResponse.json({ success: false, error: "Deal not found for partner." }, { status: 404 });
    if (deal.status !== "won") {
      return NextResponse.json({ success: false, error: "Commission can only be calculated from a won deal." }, { status: 409 });
    }

    const rules = await repository.listCommissionRules(principal.workspaceId);
    const rule = rules.find((item) => item.id === body.ruleId);
    if (!rule) return NextResponse.json({ success: false, error: "Commission rule not found." }, { status: 404 });

    const result = calculateCommission({
      sourceAmountCents: deal.amountCents,
      currency: deal.currency,
      rule,
      periodIndex: body.periodIndex,
    });
    if (!result.eligible) {
      return NextResponse.json({ success: false, eligible: false, reason: result.reason }, { status: 409 });
    }

    const existing = await repository.listCommissions(principal.workspaceId, partner.id);
    const duplicate = existing.find((item) =>
      item.dealId === deal.id && item.ruleId === rule.id && item.periodIndex === result.periodIndex,
    );
    if (duplicate) {
      return NextResponse.json({ success: true, commission: duplicate, duplicate: true });
    }

    const now = new Date().toISOString();
    const commission: Commission = {
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, partnerId: partner.id,
      dealId: deal.id, ruleId: rule.id, status: "draft", currency: result.currency,
      sourceAmountCents: result.sourceAmountCents, amountCents: result.amountCents,
      periodIndex: result.periodIndex, createdAt: now,
    };
    await repository.saveCommission(commission);
    await repository.appendAuditEvent({
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, actorId: principal.actorId,
      action: "commission.calculated", entityType: "commission", entityId: commission.id, createdAt: now,
      details: { partnerId: partner.id, dealId: deal.id, ruleId: rule.id, amountCents: commission.amountCents },
    });
    return NextResponse.json({ success: true, commission }, { status: 201 });
  } catch (error) {
    console.error("[API /partners/:partnerId/commissions POST]", error);
    return NextResponse.json({ success: false, error: "Unable to calculate commission." }, { status: 500 });
  }
}
