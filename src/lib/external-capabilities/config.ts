import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export interface ExternalProductConfig {
  readonly productId: string;
  readonly workspaceId: string;
  readonly token: string;
  readonly capabilities: readonly string[];
  readonly callbackBaseUrl?: string;
}

type RawProductConfig = {
  workspaceId?: unknown;
  token?: unknown;
  capabilities?: unknown;
  callbackBaseUrl?: unknown;
};

export class ExternalProductConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalProductConfigurationError";
  }
}

function loadMdStudioProduct(): ExternalProductConfig | null {
  const token = process.env.CLARA_MD_PRODUCT_TOKEN?.trim();
  if (!token) return null;

  return {
    productId: "melodie-digital-site",
    workspaceId: process.env.CLARA_MD_WORKSPACE_ID?.trim() || "melodie-digital",
    token,
    capabilities: ["project-intake"],
  };
}

function loadClaraLiveCallback(): string | undefined {
  const value = process.env.CLARA_LIVE_CALLBACK_BASE_URL;
  if (value === undefined) return undefined;
  const invalid = () => new ExternalProductConfigurationError("Invalid dedicated Clara Live callback URL.");
  const trimmed = value.trim();
  if (!trimmed || /[\x00-\x20\\?#]/.test(trimmed)) throw invalid();
  let url: URL;
  try { url = new URL(trimmed); } catch { throw invalid(); }
  const host = url.hostname.replace(/\.$/, "");
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !host.includes(".") || isIP(host) || host.startsWith("[") ||
      host.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
      /(^|\.)(localhost|local|internal|lan|home|invalid)$/.test(host) ||
      url.pathname.replace(/\/+$/, "").endsWith("/api/core/capabilities/execute")) throw invalid();
  return url.href.replace(/\/+$/, "");
}

function loadClaraLiveProduct(): ExternalProductConfig | null {
  const names = ["CLARA_LIVE_PRODUCT_TOKEN", "CLARA_LIVE_WORKSPACE_ID", "CLARA_LIVE_CAPABILITIES"] as const;
  // Empty configured variables are partial configuration, not legacy fallback.
  if (names.every((name) => process.env[name] === undefined) &&
      process.env.CLARA_LIVE_CALLBACK_BASE_URL === undefined) return null;
  const token = process.env.CLARA_LIVE_PRODUCT_TOKEN?.trim();
  const workspaceId = process.env.CLARA_LIVE_WORKSPACE_ID?.trim();
  let capabilities: unknown;
  try {
    capabilities = JSON.parse(process.env.CLARA_LIVE_CAPABILITIES ?? "");
  } catch {
    throw new ExternalProductConfigurationError("Invalid dedicated Clara Live configuration.");
  }
  if (!token || !workspaceId || workspaceId.length > 160 || /[\\/\0]/.test(workspaceId) ||
      !Array.isArray(capabilities) ||
      capabilities.some((item) => typeof item !== "string" || !item.trim())) {
    throw new ExternalProductConfigurationError("Invalid dedicated Clara Live configuration.");
  }
  return {
    productId: "clara-live", workspaceId, token,
    capabilities: [...new Set((capabilities as string[]).map((item) => item.trim()))],
    callbackBaseUrl: loadClaraLiveCallback(),
  };
}

export function loadExternalProducts(
  value = process.env.CLARA_EXTERNAL_PRODUCTS_JSON,
): ReadonlyMap<string, ExternalProductConfig> {
  const products = new Map<string, ExternalProductConfig>();
  const mdStudio = loadMdStudioProduct();
  if (mdStudio) products.set(mdStudio.productId, mdStudio);
  const claraLive = loadClaraLiveProduct();
  if (claraLive) products.set(claraLive.productId, claraLive);

  if (!value?.trim()) return products;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Dedicated products do not depend on legacy JSON syntax. Preserve the
    // existing Studio fallback, now also supporting dedicated Clara Live.
    if (mdStudio || claraLive) return products;
    throw new ExternalProductConfigurationError(
      "CLARA_EXTERNAL_PRODUCTS_JSON must contain valid JSON.",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ExternalProductConfigurationError(
      "CLARA_EXTERNAL_PRODUCTS_JSON must be a product configuration object.",
    );
  }

  for (const [productId, raw] of Object.entries(parsed as Record<string, RawProductConfig>)) {
    // Dedicated Studio credentials take precedence over the legacy JSON entry.
    if (mdStudio && productId === mdStudio.productId) continue;

    if (claraLive && productId === claraLive.productId) {
      if (claraLive.callbackBaseUrl !== undefined) continue;
      // Retain the existing callback destination, but never legacy credentials
      // or grants. OS callbacks use the same newly configured product token.
      const callbackBaseUrl = typeof raw?.callbackBaseUrl === "string"
        ? raw.callbackBaseUrl.trim().replace(/\/$/, "") : undefined;
      if (callbackBaseUrl && !callbackBaseUrl.startsWith("https://")) {
        throw new ExternalProductConfigurationError("External product callback must use HTTPS: clara-live");
      }
      products.set(claraLive.productId, { ...claraLive, callbackBaseUrl });
      continue;
    }

    const workspaceId = typeof raw?.workspaceId === "string" ? raw.workspaceId.trim() : "";
    const token = typeof raw?.token === "string" ? raw.token.trim() : "";
    const callbackBaseUrl = typeof raw?.callbackBaseUrl === "string" ? raw.callbackBaseUrl.trim().replace(/\/$/, "") : undefined;
    if (callbackBaseUrl && !callbackBaseUrl.startsWith("https://")) {
      throw new ExternalProductConfigurationError(`External product callback must use HTTPS: ${productId}`);
    }
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
      callbackBaseUrl,
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
