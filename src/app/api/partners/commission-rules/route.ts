import { NextResponse } from "next/server";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal, isSameOriginRequest } from "@/lib/partners/server-context";
import type { CommissionModel, CommissionRule } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

type CreateRuleBody = {
  name: string;
  model: CommissionModel;
  percentageBps?: number;
  fixedAmountCents?: number;
  recurringMonths?: number;
};

function parseBody(value: unknown): CreateRuleBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const model = body.model === "percentage" || body.model === "fixed" ? body.model : null;
  const percentageBps = typeof body.percentageBps === "number" ? body.percentageBps : undefined;
  const fixedAmountCents = typeof body.fixedAmountCents === "number" ? body.fixedAmountCents : undefined;
  const recurringMonths = typeof body.recurringMonths === "number" ? body.recurringMonths : undefined;

  if (!name || name.length > 160 || !model) return null;
  if (recurringMonths !== undefined && (!Number.isInteger(recurringMonths) || recurringMonths < 1 || recurringMonths > 120)) return null;
  if (model === "percentage") {
    if (!Number.isInteger(percentageBps) || percentageBps === undefined || percentageBps < 0 || percentageBps > 10_000) return null;
    if (fixedAmountCents !== undefined) return null;
  } else {
    if (!Number.isSafeInteger(fixedAmountCents) || fixedAmountCents === undefined || fixedAmountCents < 0) return null;
    if (percentageBps !== undefined) return null;
  }

  return { name, model, percentageBps, fixedAmountCents, recurringMonths };
}

export async function GET() {
  try {
    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const rules = await repository.listCommissionRules(principal.workspaceId);
    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error("[API /partners/commission-rules GET]", error);
    return NextResponse.json({ success: false, error: "Unable to load commission rules." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized request origin." }, { status: 403 });
    }
    let rawBody: unknown;
    try { rawBody = await request.json(); } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
    const body = parseBody(rawBody);
    if (!body) return NextResponse.json({ success: false, error: "Invalid commission rule request." }, { status: 400 });

    const principal = getPartnerPrincipal();
    const repository = new DatabasePartnerRepository();
    const now = new Date().toISOString();
    const rule: CommissionRule = {
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, name: body.name, model: body.model,
      percentageBps: body.percentageBps, fixedAmountCents: body.fixedAmountCents,
      recurringMonths: body.recurringMonths, active: true, createdAt: now, updatedAt: now,
    };
    await repository.saveCommissionRule(rule);
    await repository.appendAuditEvent({
      id: crypto.randomUUID(), workspaceId: principal.workspaceId, actorId: principal.actorId,
      action: "commission_rule.created", entityType: "commission_rule", entityId: rule.id, createdAt: now,
      details: { model: rule.model, active: rule.active },
    });
    return NextResponse.json({ success: true, rule }, { status: 201 });
  } catch (error) {
    console.error("[API /partners/commission-rules POST]", error);
    return NextResponse.json({ success: false, error: "Unable to create commission rule." }, { status: 500 });
  }
}
