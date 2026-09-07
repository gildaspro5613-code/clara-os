import { NextResponse } from "next/server";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal, isSameOriginRequest } from "@/lib/partners/server-context";
import type { Referral, ReferralStatus } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ partnerId: string }> };

type CreateReferralBody = {
  email?: string;
  contactId?: string;
  status: ReferralStatus;
  metadata?: Record<string, unknown>;
};

const REFERRAL_STATUSES = new Set<ReferralStatus>(["captured", "qualified", "converted", "lost"]);

function parseBody(value: unknown): CreateReferralBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const contactId = typeof body.contactId === "string" ? body.contactId.trim() : undefined;
  const status = typeof body.status === "string" ? body.status as ReferralStatus : "captured";
  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, unknown>
    : undefined;

  if (!REFERRAL_STATUSES.has(status)) return null;
  if (email && (!email.includes("@") || email.length > 320)) return null;
  if (contactId && contactId.length > 160) return null;
  if (!email && !contactId) return null;
  return { email, contactId, status, metadata };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { partnerId } = await context.params;
    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const partner = await repository.findPartner(principal.workspaceId, partnerId);
    if (!partner) return NextResponse.json({ success: false, error: "Partner not found." }, { status: 404 });
    const referrals = await repository.listReferrals(principal.workspaceId, partner.id);
    return NextResponse.json({ success: true, referrals });
  } catch (error) {
    console.error("[API /partners/:partnerId/referrals GET]", error);
    return NextResponse.json({ success: false, error: "Unable to load referrals." }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "Only active partners can receive new referrals." }, { status: 409 });
    }

    let rawBody: unknown;
    try { rawBody = await request.json(); } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
    const body = parseBody(rawBody);
    if (!body) return NextResponse.json({ success: false, error: "Invalid referral request." }, { status: 400 });

    const now = new Date().toISOString();
    const referral: Referral = {
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, partnerId: partner.id,
      referralCode: partner.referralCode, email: body.email, contactId: body.contactId,
      status: body.status, capturedAt: now,
      convertedAt: body.status === "converted" ? now : undefined,
      metadata: body.metadata,
    };
    await repository.saveReferral(referral);
    await repository.appendAuditEvent({
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, actorId: principal.actorId,
      action: "referral.created", entityType: "referral", entityId: referral.id, createdAt: now,
      details: { partnerId: partner.id, status: referral.status },
    });
    return NextResponse.json({ success: true, referral }, { status: 201 });
  } catch (error) {
    console.error("[API /partners/:partnerId/referrals POST]", error);
    return NextResponse.json({ success: false, error: "Unable to create referral." }, { status: 500 });
  }
}
