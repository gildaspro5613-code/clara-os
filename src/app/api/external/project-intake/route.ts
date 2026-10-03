import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";

import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import { receiveMdProjectIntake } from "@/lib/intake/md-project-intake";
import { persistProjectIntake } from "@/lib/intake/md-project-intake-inbox";
import { runProjectIntakeWorker } from "@/lib/intake/md-project-intake-worker";

export const dynamic = "force-dynamic";

export function intakeSessionKey(
  productId: string,
  workspaceId: string,
  submissionId: string,
): string {
  return "external:md-project-intake:" +
    createHash("sha256")
      .update([productId, workspaceId, submissionId].join("\u001f"))
      .digest("hex");
}

function externalProductConfigDiagnostic(error: ExternalProductConfigurationError): string {
  const message = error.message;
  if (message.includes("valid JSON")) return "CONFIG_INVALID_JSON";
  if (message.includes("product configuration object")) return "CONFIG_INVALID_ROOT";
  if (message.includes("callback must use HTTPS")) return "CONFIG_INVALID_CALLBACK";
  if (message.includes("Invalid external product configuration")) return "CONFIG_INVALID_PRODUCT";
  return "CONFIG_INVALID";
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

    const key = intakeSessionKey(
      product.productId,
      product.workspaceId,
      received.intake.submissionId,
    );
    const event = {
      ...received.event,
      context: {
        ...received.event.context,
        productId: product.productId,
        workspaceId: product.workspaceId,
        sessionId: key,
      },
    };

    await persistProjectIntake({
      workspaceId: product.workspaceId,
      submissionId: received.intake.submissionId,
      productId: product.productId,
      sessionKey: key,
      eventId: event.id,
      intake: received.intake,
    });

    // Best-effort immediate processing. Durability lives in the inbox; the worker
    // can safely reclaim an interrupted processing item later.
    after(async () => {
      await runProjectIntakeWorker().catch((error) => {
        console.error("[API /external/project-intake] durable worker", error);
      });
    });

    return NextResponse.json(
      {
        accepted: true,
        status: "accepted_by_clara_os",
        submissionId: received.intake.submissionId,
        eventId: event.id,
        missionId: null,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof ExternalProductConfigurationError) {
      const diagnostic = externalProductConfigDiagnostic(error);
      console.error("[API /external/project-intake] gateway configuration", diagnostic);
      return NextResponse.json(
        { accepted: false, status: "gateway_not_configured", diagnostic },
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
