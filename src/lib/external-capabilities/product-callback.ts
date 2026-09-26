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
