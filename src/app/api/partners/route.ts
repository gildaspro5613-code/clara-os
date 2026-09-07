import { NextResponse } from "next/server";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal, isSameOriginRequest } from "@/lib/partners/server-context";
import type { Partner, PartnerType } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

type CreatePartnerBody = {
  name: string;
  legalName?: string;
  email: string;
  type: PartnerType;
};

const PARTNER_TYPES = new Set<PartnerType>(["referrer", "reseller", "integrator"]);

function parseCreatePartnerBody(value: unknown): CreatePartnerBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const legalName = typeof body.legalName === "string" ? body.legalName.trim() : undefined;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const type = typeof body.type === "string" ? body.type.trim() as PartnerType : undefined;

  if (!name || !email || !type || !PARTNER_TYPES.has(type)) return null;
  if (!email.includes("@") || email.length > 320) return null;
  if (name.length > 160 || (legalName && legalName.length > 200)) return null;

  return { name, legalName: legalName || undefined, email, type };
}

function referralCodeFrom(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "partner";
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function GET() {
  try {
    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const partners = await repository.listPartners(principal.workspaceId);

    return NextResponse.json({ success: true, partners });
  } catch (error) {
    console.error("[API /partners GET]", error);
    return NextResponse.json(
      { success: false, error: "Unable to load partners." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized request origin." },
        { status: 403 },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const body = parseCreatePartnerBody(rawBody);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid partner request." },
        { status: 400 },
      );
    }

    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const now = new Date().toISOString();
    const partner: Partner = {
      id: crypto.randomUUID(),
      workspaceId: principal.workspaceId,
      name: body.name,
      legalName: body.legalName,
      email: body.email,
      type: body.type,
      status: "pending",
      referralCode: referralCodeFrom(body.name),
      createdAt: now,
      updatedAt: now,
    };

    await repository.savePartner(partner);
    await repository.appendAuditEvent({
      id: crypto.randomUUID(),
      workspaceId: principal.workspaceId,
      actorId: principal.actorId,
      action: "partner.created",
      entityType: "partner",
      entityId: partner.id,
      createdAt: now,
      details: { type: partner.type, status: partner.status },
    });

    return NextResponse.json({ success: true, partner }, { status: 201 });
  } catch (error) {
    console.error("[API /partners POST]", error);
    return NextResponse.json(
      { success: false, error: "Unable to create partner." },
      { status: 500 },
    );
  }
}
