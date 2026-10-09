import { NextResponse } from "next/server";
import { authenticateExternalProduct, ExternalProductConfigurationError } from "@/lib/external-capabilities/config";
import { documentOperations, operationScopeKey, type DocumentOperationScope } from "@/lib/external-capabilities/document-operations";
export const dynamic = "force-dynamic";

// POST keeps scope identifiers out of URL/access logs. This route executes no
// capability and uses precisely the existing server-to-server authentication.
export async function POST(request: Request) {
  try {
    const product = authenticateExternalProduct(request.headers.get("x-clara-product"), request.headers.get("authorization"));
    if (!product) {
      // Internal-only classification. Never log tokens, token fingerprints,
      // authorization header values, workspace IDs or request bodies.
      const productId = request.headers.get("x-clara-product");
      const authorization = request.headers.get("authorization");
      const reason = !productId ? "missing_product_header"
        : productId !== "clara-live" ? "unrecognized_product_header"
        : !authorization ? "missing_authorization"
        : !authorization.startsWith("Bearer ") ? "invalid_authorization_scheme"
        : "credential_rejected";
      console.warn("external_document_operation_auth_denied", { reason });
      return NextResponse.json({ success: false, error: "Unauthorized external product." }, { status: 401 });
    }
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 }); }
    const scope = body?.scope as DocumentOperationScope | undefined;
    if (typeof body?.operationId !== "string" || !/^[a-f0-9]{64}$/.test(body.operationId) ||
        !scope || [scope.productId, scope.workspaceId, scope.userId, scope.sessionId].some((value) =>
          typeof value !== "string" || !value.trim() || value.length > 160 || /[\\/\0]/.test(value)) ||
        scope.productId.length > 80) {
      return NextResponse.json({ success: false, error: "Invalid document operation scope." }, { status: 400 });
    }
    if (scope.productId !== product.productId) return NextResponse.json({ success: false, error: "Product scope mismatch." }, { status: 403 });
    const operation = await documentOperations.lookup(operationScopeKey(scope, product.workspaceId), body.operationId);
    if (!operation) return NextResponse.json({ success: false, code: "DOCUMENT_OPERATION_NOT_FOUND", error: "Document operation not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: { operationId: operation.operation_id,
      status: operation.status, result: operation.result } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof ExternalProductConfigurationError
      ? "External product gateway is not configured." : "Document operation registry unavailable." }, { status: 503 });
  }
}
