import { timingSafeEqual } from "node:crypto";

export interface ExternalProductConfig {
  readonly productId: string;
  readonly workspaceId: string;
  readonly token: string;
  readonly capabilities: readonly string[];
}

type RawProductConfig = {
  workspaceId?: unknown;
  token?: unknown;
  capabilities?: unknown;
};

export class ExternalProductConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalProductConfigurationError";
  }
}

export function loadExternalProducts(
  value = process.env.CLARA_EXTERNAL_PRODUCTS_JSON,
): ReadonlyMap<string, ExternalProductConfig> {
  if (!value?.trim()) return new Map();

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ExternalProductConfigurationError(
      "CLARA_EXTERNAL_PRODUCTS_JSON must contain valid JSON.",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ExternalProductConfigurationError(
      "CLARA_EXTERNAL_PRODUCTS_JSON must be a product configuration object.",
    );
  }

  const products = new Map<string, ExternalProductConfig>();
  for (const [productId, raw] of Object.entries(parsed as Record<string, RawProductConfig>)) {
    const workspaceId = typeof raw?.workspaceId === "string" ? raw.workspaceId.trim() : "";
    const token = typeof raw?.token === "string" ? raw.token.trim() : "";
    const capabilities = Array.isArray(raw?.capabilities)
      ? raw.capabilities.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    if (!productId.trim() || !workspaceId || !token || capabilities.length === 0) {
      throw new ExternalProductConfigurationError(
        `Invalid external product configuration: ${productId || "<empty>"}`,
      );
    }

    products.set(productId, {
      productId,
      workspaceId,
      token,
      capabilities: capabilities.map((capability) => capability.trim()),
    });
  }

  return products;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function authenticateExternalProduct(
  productId: string | null,
  authorization: string | null,
  products: ReadonlyMap<string, ExternalProductConfig> = loadExternalProducts(),
): ExternalProductConfig | null {
  if (!productId || !authorization?.startsWith("Bearer ")) return null;
  const product = products.get(productId);
  if (!product) return null;
  const presentedToken = authorization.slice("Bearer ".length).trim();
  return presentedToken && constantTimeEqual(presentedToken, product.token)
    ? product
    : null;
}
