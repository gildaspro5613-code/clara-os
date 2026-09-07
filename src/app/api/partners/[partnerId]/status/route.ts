import { NextResponse } from "next/server";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal, isSameOriginRequest } from "@/lib/partners/server-context";
import type { PartnerStatus } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ partnerId: string }> };

const TRANSITIONS: Record<PartnerStatus, ReadonlySet<PartnerStatus>> = {
  pending: new Set(["active", "closed"]),
  active: new Set(["paused", "closed"]),
  paused: new Set(["active", "closed"]),
  closed: new Set(),
};

function parseStatus(value: unknown): PartnerStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = (value as Record<string, unknown>).status;
  return status === "pending" || status === "active" || status === "paused" || status === "closed"
    ? status
    : null;
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
    if (!partner) {
      return NextResponse.json({ success: false, error: "Partner not found." }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
    const status = parseStatus(rawBody);
    if (!status) {
      return NextResponse.json({ success: false, error: "Invalid partner status." }, { status: 400 });
    }
    if (status === partner.status) {
      return NextResponse.json({ success: true, partner });
    }
    if (!TRANSITIONS[partner.status].has(status)) {
      return NextResponse.json({ success: false, error: "Invalid partner status transition." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updated = { ...partner, status, updatedAt: now };
    await repository.savePartner(updated);
    await repository.appendAuditEvent({
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, actorId: principal.actorId,
      action: "partner.status_changed", entityType: "partner", entityId: partner.id, createdAt: now,
      details: { from: partner.status, to: status },
    });

    return NextResponse.json({ success: true, partner: updated });
  } catch (error) {
    console.error("[API /partners/:partnerId/status POST]", error);
    return NextResponse.json({ success: false, error: "Unable to update partner status." }, { status: 500 });
  }
}
