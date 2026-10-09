import { NextResponse } from "next/server";
import { authenticateExternalProduct } from "@/lib/external-capabilities/config";
import { documentOperations, operationScopeKey, operationFingerprint, type DocumentOperationScope } from "@/lib/external-capabilities/document-operations";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const product = authenticateExternalProduct(request.headers.get("x-clara-product"), request.headers.get("authorization"));
    if (!product) return reply({ success: false, error: "Unauthorized external product." }, 401);
    if (product.productId !== "clara-live") return reply({ success: false, error: "Product not eligible." }, 403);
    let body;
    try { body = await request.json(); } catch { return reply({ success: false, error: "Invalid request." }, 400); }
    const event = body?.event;
    const scope = event?.scope as DocumentOperationScope | undefined;
    if (!["inspect", "authorize"].includes(body?.action) || typeof body?.operationId !== "string" || !/^[a-f0-9]{64}$/.test(body.operationId) ||
        !event || Array.isArray(event) || event.operationId !== undefined || event.retryOf !== undefined || event.schemaVersion !== "clara.unified-core.event.v1" || event.eventType !== "LIVE_DOCUMENT_ANALYSIS_REQUESTED" ||
        !scope || [scope.productId, scope.workspaceId, scope.userId, scope.sessionId].some(v =>
          typeof v !== "string" || !v.trim() || v.length > 160 || /[\\/\0]/.test(v)) || scope.productId.length > 80) {
      return reply({ success: false, error: "Invalid recovery scope." }, 400);
    }
    if (scope.productId !== product.productId) return reply({ success: false, error: "Product scope mismatch." }, 403);
    const key = operationScopeKey(scope, product.workspaceId);
    const operation = await documentOperations.inspect(key, body.operationId);
    if (!operation) return reply({ success: false, code: "DOCUMENT_OPERATION_NOT_FOUND" }, 404);
    const matches = operation.fingerprint === operationFingerprint(event);
    const eligible = operation.status === "failed" && operation.result === null && matches;
    if (body.action === "authorize") {
      if (body.confirm !== true || !eligible) return reply({ success: false, code: "DOCUMENT_RETRY_NOT_ADMISSIBLE" }, 409);
      const attemptId = await documentOperations.authorizeRetry(key, body.operationId, operation.fingerprint, scope.userId);
      return reply({ success: true, data: { operationId: body.operationId, attemptId, status: "authorized" } });
    }
    return reply({ success: true, data: { operationId: body.operationId, status: operation.status,
      fingerprintMatches: matches, hasResult: operation.result !== null, retryEligible: eligible,
      result: operation.result } });
  } catch {
    return reply({ success: false, code: "DOCUMENT_RECOVERY_UNAVAILABLE" }, 503);
  }
}
