import { NextResponse } from "next/server";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal, isSameOriginRequest } from "@/lib/partners/server-context";
import type { Deal, DealStatus } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ partnerId: string }> };

type CreateDealBody = {
  referralId?: string;
  contactId?: string;
  offerId: string;
  status: DealStatus;
  currency: string;
  amountCents: number;
  recurringInterval?: Deal["recurringInterval"];
};

const DEAL_STATUSES = new Set<DealStatus>(["lead", "qualified", "proposal", "won", "lost"]);
const INTERVALS = new Set<NonNullable<Deal["recurringInterval"]>>(["month", "year"]);

function parseBody(value: unknown): CreateDealBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const referralId = typeof body.referralId === "string" ? body.referralId.trim() : undefined;
  const contactId = typeof body.contactId === "string" ? body.contactId.trim() : undefined;
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  const status = typeof body.status === "string" ? body.status as DealStatus : "lead";
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "EUR";
  const amountCents = typeof body.amountCents === "number" ? body.amountCents : NaN;
  const recurringInterval = typeof body.recurringInterval === "string"
    ? body.recurringInterval as NonNullable<Deal["recurringInterval"]>
    : undefined;

  if (!offerId || offerId.length > 160 || !DEAL_STATUSES.has(status)) return null;
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) return null;
  if (recurringInterval && !INTERVALS.has(recurringInterval)) return null;
  if (referralId && referralId.length > 160) return null;
  if (contactId && contactId.length > 160) return null;
  return { referralId, contactId, offerId, status, currency, amountCents, recurringInterval };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { partnerId } = await context.params;
    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const partner = await repository.findPartner(principal.workspaceId, partnerId);
    if (!partner) return NextResponse.json({ success: false, error: "Partner not found." }, { status: 404 });
    const deals = await repository.listDeals(principal.workspaceId, partner.id);
    return NextResponse.json({ success: true, deals });
  } catch (error) {
    console.error("[API /partners/:partnerId/deals GET]", error);
    return NextResponse.json({ success: false, error: "Unable to load deals." }, { status: 500 });
  }
}

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
    if (partner.status !== "active") {
      return NextResponse.json({ success: false, error: "Only active partners can receive new deals." }, { status: 409 });
    }

    let rawBody: unknown;
    try { rawBody = await request.json(); } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
    const body = parseBody(rawBody);
    if (!body) return NextResponse.json({ success: false, error: "Invalid deal request." }, { status: 400 });

    if (body.referralId) {
      const referrals = await repository.listReferrals(principal.workspaceId, partner.id);
      if (!referrals.some((referral) => referral.id === body.referralId)) {
        return NextResponse.json({ success: false, error: "Referral does not belong to this partner." }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const deal: Deal = {
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, partnerId: partner.id,
      referralId: body.referralId, contactId: body.contactId, offerId: body.offerId,
      status: body.status, currency: body.currency, amountCents: body.amountCents,
      recurringInterval: body.recurringInterval,
      wonAt: body.status === "won" ? now : undefined,
      createdAt: now, updatedAt: now,
    };
    await repository.saveDeal(deal);
    await repository.appendAuditEvent({
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, actorId: principal.actorId,
      action: "deal.created", entityType: "deal", entityId: deal.id, createdAt: now,
      details: { partnerId: partner.id, status: deal.status, offerId: deal.offerId },
    });
    return NextResponse.json({ success: true, deal }, { status: 201 });
  } catch (error) {
    console.error("[API /partners/:partnerId/deals POST]", error);
    return NextResponse.json({ success: false, error: "Unable to create deal." }, { status: 500 });
  }
}
