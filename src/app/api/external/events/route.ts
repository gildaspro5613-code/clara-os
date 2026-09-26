import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import { Clara } from "@/lib/core/clara";
import { dispatchEvent } from "@/lib/core/event-bus";
import { composeClaraResponse } from "@/lib/brain/response-composer";
import { saveSession } from "@/lib/core/store/session-store";
import type { ClaraConversationMessage } from "@/lib/core/session";
import { EventType } from "@/types";

export const dynamic = "force-dynamic";

type Scope = {
  productId: string;
  workspaceId: string;
  userId: string;
  sessionId: string;
};

type ExternalEventBody = {
  schemaVersion?: string;
  eventType?: string;
  scope?: Scope;
  message?: string;
  project?: Record<string, unknown>;
  context?: Record<string, unknown>;
  documents?: unknown[];
  liveCapabilities?: unknown[];
};

const MAX_PERSISTED_MESSAGES = 100;

function opaque(value: unknown, max = 160): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= max &&
    !/[\\/\0]/.test(value);
}

function parseBody(value: unknown): ExternalEventBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as ExternalEventBody;
  if (body.schemaVersion !== "clara.unified-core.event.v1") return null;
  if (!opaque(body.eventType, 120) || !opaque(body.message, 100_000)) return null;
  const scope = body.scope;
  if (!scope || !opaque(scope.productId, 80) || !opaque(scope.workspaceId) ||
      !opaque(scope.userId) || !opaque(scope.sessionId)) return null;
  return body;
}

function sessionKey(scope: Scope): string {
  const canonical = [scope.productId, scope.workspaceId, scope.userId, scope.sessionId].join("\u001f");
  return "external:" + createHash("sha256").update(canonical).digest("hex");
}

export async function POST(request: Request) {
  try {
    const product = authenticateExternalProduct(
      request.headers.get("x-clara-product"),
      request.headers.get("authorization"),
    );
    if (!product) {
      return NextResponse.json({ success: false, error: "Unauthorized external product." }, { status: 401 });
    }

    let raw: unknown;
    try { raw = await request.json(); }
    catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
    const body = parseBody(raw);
    if (!body || !body.scope) {
      return NextResponse.json({ success: false, error: "Invalid Clara Core event." }, { status: 400 });
    }

    // Product identity is authenticated by the server-side credential and may
    // never be overridden by the caller's event body.
    if (body.scope.productId !== product.productId) {
      return NextResponse.json({ success: false, error: "Product scope mismatch." }, { status: 403 });
    }

    const key = sessionKey(body.scope);
    const clara = new Clara(key);
    const event = {
      id: crypto.randomUUID(),
      type: body.eventType === "USER_MESSAGE" ? EventType.USER_MESSAGE : EventType.DOCUMENT_RECEIVED,
      source: "EXTERNAL_PRODUCT",
      timestamp: new Date(),
      context: {
        productId: product.productId,
        workspaceId: body.scope.workspaceId,
        userId: body.scope.userId,
        sessionId: body.scope.sessionId,
        metadata: {
          externalProductWorkspaceId: product.workspaceId,
          surface: body.context?.surface,
          project: body.project,
          documents: body.documents ?? [],
          liveCapabilities: body.liveCapabilities ?? [],
          externalEventType: body.eventType,
        },
      },
      payload: {
        message: body.message,
        project: body.project,
        context: body.context,
        documents: body.documents ?? [],
        liveCapabilities: body.liveCapabilities ?? [],
      },
    };

    const session = await dispatchEvent(clara, event);
    const response = await composeClaraResponse(body.message, session);
    const now = new Date().toISOString();
    const messages: ClaraConversationMessage[] = [
      { id: crypto.randomUUID(), role: "user", content: body.message, createdAt: now },
      { id: crypto.randomUUID(), role: "clara", content: response, createdAt: new Date().toISOString() },
    ];
    session.conversation = [...session.conversation, ...messages].slice(-MAX_PERSISTED_MESSAGES);
    session.updatedAt = new Date();
    await saveSession(session, key);

    return NextResponse.json({
      success: true,
      data: {
        response,
        sessionId: body.scope.sessionId,
        missionId: session.mission?.id ?? null,
        structuredResult: {
          state: session.state,
          recommendation: session.recommendation
            ? { summary: session.recommendation.summary, rationale: session.recommendation.rationale }
            : null,
          mission: session.mission
            ? {
                id: session.mission.id,
                title: session.mission.title,
                objective: session.mission.objective,
                status: session.mission.status,
                progress: session.mission.progress,
                nextAction: session.mission.nextAction,
              }
            : null,
          sources: session.sources.map((source) => ({ summary: source.summary })),
        },
      },
    });
  } catch (error) {
    if (error instanceof ExternalProductConfigurationError) {
      return NextResponse.json({ success: false, error: "External product gateway is not configured." }, { status: 503 });
    }
    console.error("[API /external/events]", error);
    return NextResponse.json({ success: false, error: "Clara Core event processing failed." }, { status: 500 });
  }
}
