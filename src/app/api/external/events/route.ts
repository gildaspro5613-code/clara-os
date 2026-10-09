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
import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import { EventType } from "@/types";

import { DocumentRetryAuthorizationError, documentOperations, operationScopeKey, operationFingerprint, type DocumentOperation } from "@/lib/external-capabilities/document-operations";

export const dynamic = "force-dynamic";

type Scope = {
  productId: string;
  workspaceId: string;
  userId: string;
  sessionId: string;
};

type ExternalEventBody = {
  operationId?: string;
  retryOf?: string;
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

type DocumentAnalysisFact = {
  entityId: string;
  property: string;
  value: string | number | boolean;
  unit: string | null;
  locator: string;
  confidence: number;
  ambiguity: string | null;
};

type DocumentAnalysisEntity = {
  id: string;
  manufacturer: string | null;
  model: string | null;
  category: string | null;
  name: string;
};

type DocumentAnalysis = {
  schemaVersion: "clara.document-analysis.v1";
  entities: DocumentAnalysisEntity[];
  facts: DocumentAnalysisFact[];
  ambiguities: string[];
  conflicts: string[];
};

function clampConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

type DocumentFailureCategory = "missing_segments" | "provider_auth" | "provider_rate_limit" | "provider_timeout" | "provider_connection" | "provider_server" | "provider_request" | "provider_unknown" | "output_truncated" | "output_filtered" | "provider_incomplete" | "provider_failed" | "empty_output" | "invalid_json" | "invalid_structure";
class DocumentAnalysisError extends Error {
  constructor(readonly category: DocumentFailureCategory, readonly diagnostics: Record<string, number | string> = {}) {
    super("Document analysis failed.");
  }
}

async function analyzeExternalDocument(body: ExternalEventBody): Promise<DocumentAnalysis | null> {
  if (body.eventType !== "LIVE_DOCUMENT_ANALYSIS_REQUESTED" || !Array.isArray(body.documents)) return null;
  const segments = body.documents.flatMap((document) => {
    if (!document || typeof document !== "object") return [];
    const candidate = document as { segments?: unknown[] };
    return Array.isArray(candidate.segments) ? candidate.segments : [];
  }).slice(0, 250);
  if (!segments.length) throw new DocumentAnalysisError("missing_segments");

  const prompt = [
    "Tu es le moteur cognitif du Brain de Clara. Analyse les extraits documentaires fournis.",
    "Clara reste l'autorité cognitive; ce résultat est une proposition structurée qui sera vérifiée par les outils métier.",
    "N'invente rien. Chaque fait doit avoir un locator explicitement présent dans les extraits.",
    "Distingue les entités, faits, ambiguïtés et conflits. Un fait documenté n'est jamais certifié ni vérifié par cette analyse.",
    'Retourne UNIQUEMENT un JSON valide: {"entities":[{"id":"...","manufacturer":null,"model":null,"category":null,"name":"..."}],"facts":[{"entityId":"...","property":"...","value":"...","unit":null,"locator":"...","confidence":0.0,"ambiguity":null}],"ambiguities":[],"conflicts":[]}.',
    "Contexte:",
    JSON.stringify(body.context ?? {}),
    "Extraits:",
    JSON.stringify(segments),
  ].join("\n");

  const result = await new OpenAIResponsesEngine().generate({
    prompt,
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
    maxTokens: 6000,
    outputProfile: "document_analysis",
  });
  const diagnostics: Record<string, number | string> = { segment_count: segments.length, prompt_chars: prompt.length, requested_output_tokens: 6000 };
  if (typeof result.providerHttpStatus === "number") diagnostics.provider_http_status = result.providerHttpStatus;
  if (typeof result.outputTokens === "number") diagnostics.output_tokens = result.outputTokens;
  if (!result.success) throw new DocumentAnalysisError(result.failureCategory ?? "provider_unknown", diagnostics);
  if (result.responseStatus === "incomplete") throw new DocumentAnalysisError(result.incompleteReason === "max_output_tokens" ? "output_truncated" : result.incompleteReason === "content_filter" ? "output_filtered" : "provider_incomplete", diagnostics);
  if (result.responseStatus === "failed" || result.responseStatus === "other") throw new DocumentAnalysisError("provider_failed", diagnostics);
  if (!result.content.trim()) throw new DocumentAnalysisError("empty_output", diagnostics);
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(result.content); }
  catch { throw new DocumentAnalysisError("invalid_json", diagnostics); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      ![parsed.entities, parsed.facts, parsed.ambiguities, parsed.conflicts].every(Array.isArray)) {
    throw new DocumentAnalysisError("invalid_structure", diagnostics);
  }
  try {
    const entities = Array.isArray(parsed.entities) ? parsed.entities.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      if (typeof item.id !== "string" || typeof item.name !== "string") return [];
      return [{
        id: item.id.slice(0, 200),
        manufacturer: typeof item.manufacturer === "string" ? item.manufacturer.slice(0, 200) : null,
        model: typeof item.model === "string" ? item.model.slice(0, 200) : null,
        category: typeof item.category === "string" ? item.category.slice(0, 120) : null,
        name: item.name.slice(0, 300),
      }];
    }) : [];
    const entityIds = new Set(entities.map((entity) => entity.id));
    const facts = Array.isArray(parsed.facts) ? parsed.facts.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      if (typeof item.entityId !== "string" || !entityIds.has(item.entityId) ||
          typeof item.property !== "string" || typeof item.locator !== "string" ||
          !["string", "number", "boolean"].includes(typeof item.value)) return [];
      return [{
        entityId: item.entityId,
        property: item.property.slice(0, 200),
        value: item.value as string | number | boolean,
        unit: typeof item.unit === "string" ? item.unit.slice(0, 80) : null,
        locator: item.locator.slice(0, 300),
        confidence: clampConfidence(item.confidence),
        ambiguity: typeof item.ambiguity === "string" ? item.ambiguity.slice(0, 500) : null,
      }];
    }) : [];
    const strings = (value: unknown) => Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 1000)).slice(0, 100)
      : [];
    return {
      schemaVersion: "clara.document-analysis.v1",
      entities: entities.slice(0, 1000),
      facts: facts.slice(0, 5000),
      ambiguities: strings(parsed.ambiguities),
      conflicts: strings(parsed.conflicts),
    };
  } catch {
    throw new DocumentAnalysisError("invalid_structure", diagnostics);
  }
}


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
  if (!opaque(body.eventType, 120)) return null;
  // Conversation text is not an opaque identifier: Live includes slash-bearing
  // domain names, source names and JSON escapes in its effective-state message.
  if (typeof body.message !== "string" || !body.message.trim() ||
      body.message.length > 100_000 || body.message.includes("\0")) return null;
  if (body.operationId !== undefined && (typeof body.operationId !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.operationId) || body.eventType !== "LIVE_DOCUMENT_ANALYSIS_REQUESTED")) return null;
  if (body.retryOf !== undefined && (!body.operationId || typeof body.retryOf !== "string" ||
      !/^[a-f0-9]{64}$/.test(body.retryOf) || body.retryOf === body.operationId)) return null;
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
  const incomingId = request.headers.get("x-clara-correlation-id");
  const correlationId = incomingId && /^[a-f0-9]{32}$/.test(incomingId) ? incomingId : crypto.randomUUID().replaceAll("-", "");
  const started = performance.now();
  let phase = "authentication";
  let phaseStarted = started;
  let httpStatus: number | null = null;
  let operation = "unknown_event";
  let reserved: DocumentOperation | null = null;
  let resultPersisted = false;
  const log = (event: string, extra: Record<string, unknown> = {}) => console.info("External Core call", JSON.stringify({
    correlation_id: correlationId, event, phase, operation, ...extra,
  }));
  const advance = (next: string) => {
    log("phase_end", { duration_ms: Math.round(performance.now() - phaseStarted) });
    phase = next;
    phaseStarted = performance.now();
    log("phase_start");
  };
  const respond = (body: unknown, status: number) => {
    httpStatus = status;
    return NextResponse.json(body, { status });
  };
  log("start");
  try {
    const product = authenticateExternalProduct(
      request.headers.get("x-clara-product"),
      request.headers.get("authorization"),
    );
    if (!product) {
      return respond({ success: false, error: "Unauthorized external product." }, 401);
    }

    advance("body_validation");
    let raw: unknown;
    try { raw = await request.json(); }
    catch {
      return respond({ success: false, error: "Invalid JSON request body." }, 400);
    }
    const body = parseBody(raw);
    if (!body || !body.scope) {
      return respond({ success: false, error: "Invalid Clara Core event." }, 400);
    }
    operation = body.eventType === "USER_MESSAGE" ? "user_message" :
      body.eventType === "LIVE_DOCUMENT_ANALYSIS_REQUESTED" ? "document_analysis" : "external_event";

    // Product identity is authenticated by the server-side credential and may
    // never be overridden by the caller's event body.
    if (body.scope.productId !== product.productId) {
      return respond({ success: false, error: "Product scope mismatch." }, 403);
    }

    const message = body.message;
    const scope = body.scope;
    if (!message || !scope) {
      return respond({ success: false, error: "Invalid Clara Core event." }, 400);
    }

    if (body.retryOf && product.productId !== "clara-live") {
      return respond({ success: false, error: "Product not eligible for document retry." }, 403);
    }
    if (body.operationId) {
      advance("operation_reservation");
      const fingerprint = operationFingerprint(body as Record<string, unknown>);
      let reservation;
      try { reservation = body.retryOf
        ? await documentOperations.reserveRetry(operationScopeKey(scope, product.workspaceId), body.operationId, body.retryOf, fingerprint)
        : await documentOperations.reserve(operationScopeKey(scope, product.workspaceId), body.operationId, fingerprint, product.productId === "clara-live"); }
      catch (error) {
        if (error instanceof DocumentRetryAuthorizationError) return respond({ success: false, code: "DOCUMENT_RETRY_AUTHORIZATION_REQUIRED", error: "Retry parent required." }, 409);
        return respond({ success: false, code: "DOCUMENT_REGISTRY_UNAVAILABLE", error: "Document operation registry unavailable." }, 503);
      }
      if (reservation.operation.fingerprint !== fingerprint) {
        return respond({ success: false, code: "DOCUMENT_OPERATION_CONFLICT", error: "Document operation payload conflict." }, 409);
      }
      if (!reservation.owned) {
        const existing = reservation.operation;
        if (existing.status === "completed") return respond({ success: true, data: existing.result }, 200);
        return respond({ success: true, data: { operationId: existing.operation_id, status: existing.status, result: null } }, 202);
      }
      reserved = reservation.operation;
    }
    const key = sessionKey(scope);
    const clara = new Clara(key, product.workspaceId);
    const event = {
      id: crypto.randomUUID(),
      type: body.eventType === "USER_MESSAGE" ? EventType.USER_MESSAGE : EventType.DOCUMENT_RECEIVED,
      source: "EXTERNAL_PRODUCT",
      timestamp: new Date(),
      context: {
        productId: product.productId,
        workspaceId: scope.workspaceId,
        userId: scope.userId,
        sessionId: scope.sessionId,
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

    advance("core_dispatch");
    const session = await dispatchEvent(clara, event);
    advance("response_composition");
    const response = await composeClaraResponse(message, session);
    advance("document_analysis");
    const documentAnalysis = await analyzeExternalDocument(body);
    if (reserved && !documentAnalysis) throw new Error("Document analysis unavailable.");
    const data = {
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
        documentAnalysis,
      },
    };
    if (reserved) {
      advance("operation_persistence");
      await documentOperations.complete(reserved, data);
      resultPersisted = true;
    }
    advance("session_persistence");
    const now = new Date().toISOString();
    const messages: ClaraConversationMessage[] = [
      { id: crypto.randomUUID(), role: "user", content: message, createdAt: now },
      { id: crypto.randomUUID(), role: "clara", content: response, createdAt: new Date().toISOString() },
    ];
    session.conversation = [...session.conversation, ...messages].slice(-MAX_PERSISTED_MESSAGES);
    session.updatedAt = new Date();
    await saveSession(session, key);

    return respond({ success: true, data }, 200);
  } catch (error) {
    if (reserved && !resultPersisted) {
      // A failed storage write remains processing/uncertain if this update also
      // fails. Neither case grants another invocation permission to execute.
      try { await documentOperations.fail(reserved); } catch { /* fail closed */ }
    }
    if (error instanceof ExternalProductConfigurationError) {
      return respond({ success: false, error: "External product gateway is not configured." }, 503);
    }
    log("processing_failed", error instanceof DocumentAnalysisError
      ? { failure_category: error.category, ...error.diagnostics }
      : phase === "document_analysis" ? { failure_category: "unexpected_exception" } : {});
    return respond({ success: false, error: "Clara Core event processing failed." }, 500);
  } finally {
    log("phase_end", { duration_ms: Math.round(performance.now() - phaseStarted) });
    log("end", { duration_ms: Math.round(performance.now() - started), http_status: httpStatus,
      outcome: httpStatus === 200 ? "completed" : "rejected_or_failed" });
  }
}
