import { assertRecetteExternalExecutionBlocked } from "@/lib/recette/external-execution-guard";
import type { ExternalProductConfig } from "./config";

export interface ExternalProductExecutionRequest {
  capability: string;
  userId: string;
  workspaceId: string;
  sessionId: string;
  context: unknown;
}

export async function executeExternalProductCapability(
  product: ExternalProductConfig,
  request: ExternalProductExecutionRequest,
): Promise<{ success: boolean; message: string; content?: string }> {
  if (!product.callbackBaseUrl) {
    return { success: false, message: `No callback is configured for external product ${product.productId}.` };
  }
  // Native certification remains separate: bounded transport is not user/project
  // authorization, operation attestation, or an atomic cross-product transaction.
  if (product.productId === "clara-live") return executeLiveCallback(product, request);
  assertRecetteExternalExecutionBlocked("external-product.callback");
  const response = await fetch(`${product.callbackBaseUrl}/api/core/capabilities/execute`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${product.token}`,
      "x-clara-product": product.productId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return { success: false, message: `External product capability failed with status ${response.status}.` };
  }
  const data = payload as { success?: unknown; message?: unknown; result?: unknown };
  return {
    success: data?.success === true,
    message: typeof data?.message === "string" ? data.message : "External product capability completed.",
    content: data?.result === undefined ? undefined : JSON.stringify(data.result),
  };
}

async function executeLiveCallback(product: ExternalProductConfig, request: ExternalProductExecutionRequest) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  const failed = { success: false, message: "Clara Live result unavailable; reconcile before retrying." };
  try {
    assertRecetteExternalExecutionBlocked("external-product.callback");
    const response = await fetch(`${product.callbackBaseUrl}/api/core/capabilities/execute`, {
      method: "POST", redirect: "error", signal: controller.signal,
      headers: { Authorization: `Bearer ${product.token}`, "x-clara-product": product.productId,
        "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(request), cache: "no-store",
    });
    if (!response.ok || !response.body) { await response.body?.cancel(); return failed; }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const {done, value} = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 65_536) return failed;
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) return failed;
    const payload = data as {success?:unknown;message?:unknown;result?:unknown};
    if (payload.success !== true || !payload.result || typeof payload.result !== "object" || Array.isArray(payload.result)
        || (payload.message !== undefined && (typeof payload.message !== "string" || payload.message.length > 2_000))) return failed;
    return { success: true, message: typeof payload.message === "string" ? payload.message : "Clara Live result received.",
      content: JSON.stringify(payload.result) };
  } catch { return failed; }
  finally { clearTimeout(timer); }
}
