import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { Clara } from "@/lib/core/clara";
import { dispatchEvent } from "@/lib/core/event-bus";
import { saveSession } from "@/lib/core/store/session-store";
import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import { receiveMdProjectIntake } from "@/lib/intake/md-project-intake";

export const dynamic = "force-dynamic";

function intakeSessionKey(payload: unknown): string {
  return "external:md-project-intake:" +
    createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function POST(request: Request) {
  try {
    const product = authenticateExternalProduct(
      request.headers.get("x-clara-product"),
      request.headers.get("authorization"),
    );
    if (!product) {
      return NextResponse.json(
        { accepted: false, status: "unauthorized" },
        { status: 401 },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { accepted: false, status: "invalid_json" },
        { status: 400 },
      );
    }

    let received;
    try {
      received = receiveMdProjectIntake(raw);
    } catch {
      return NextResponse.json(
        { accepted: false, status: "invalid_project_intake" },
        { status: 400 },
      );
    }

    if (product.productId !== received.intake.source.system) {
      return NextResponse.json(
        { accepted: false, status: "product_scope_mismatch" },
        { status: 403 },
      );
    }

    const key = intakeSessionKey(received.intake);
    const clara = new Clara(key, product.workspaceId);
    const session = await dispatchEvent(clara, received.event);
    session.updatedAt = new Date();
    await saveSession(session, key);

    return NextResponse.json(
      {
        accepted: true,
        status: "accepted_by_clara_os",
        eventId: received.event.id,
        missionId: session.mission?.id ?? null,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof ExternalProductConfigurationError) {
      return NextResponse.json(
        { accepted: false, status: "gateway_not_configured" },
        { status: 503 },
      );
    }
    console.error("[API /external/project-intake]", error);
    return NextResponse.json(
      { accepted: false, status: "clara_processing_failed" },
      { status: 500 },
    );
  }
}
