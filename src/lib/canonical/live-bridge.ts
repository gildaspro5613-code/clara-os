import { loadExternalProducts } from "@/lib/external-capabilities/config";
import { RegistryError, type LinkCandidate, type LiveLinkProof } from "./registry";

/** Keep the existing product configuration/credential; never redirect it. */
export function createLiveCanonicalTransport(fetcher: typeof fetch = fetch) {
  return async function call(path: string, payload: unknown): Promise<unknown> {
    const product = loadExternalProducts().get("clara-live");
    if (!product?.callbackBaseUrl || !product.capabilities.includes("canonical-links:v1"))
      throw new RegistryError(503, "LIVE_CANONICAL_BRIDGE_UNAVAILABLE");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetcher(`${product.callbackBaseUrl}${path}`, {
        method: "POST", redirect: "error", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${product.token}`, "x-clara-product": "clara-live" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!response.ok) throw new RegistryError(response.status === 403 || response.status === 404 ? 403 : 503, "LIVE_PROOF_UNAVAILABLE");
      if (!response.body) throw new RegistryError(503, "LIVE_PROOF_UNAVAILABLE");
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 65_536) throw new RegistryError(503, "LIVE_PROOF_TOO_LARGE");
          chunks.push(value);
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      const data = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
      const body: unknown = JSON.parse(new TextDecoder().decode(data));
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new RegistryError(503, "INVALID_LIVE_PROOF");
      return body;
    } catch (error) {
      if (error instanceof RegistryError) throw error;
      throw new RegistryError(503, "LIVE_PROOF_UNAVAILABLE");
    } finally { clearTimeout(timer); }
  };
}
export function createLiveCanonicalBridge(fetcher: typeof fetch = fetch) {
  const call = createLiveCanonicalTransport(fetcher);
  return async (candidate: LinkCandidate): Promise<LiveLinkProof> => {
    const body = await call("/api/core/canonical/link-proofs/verify", { proofId: candidate.proofId, challengeHash: candidate.tokenHash }) as { proof?: LiveLinkProof };
    if (!body.proof) throw new RegistryError(503, "INVALID_LIVE_PROOF");
    return body.proof;
  };
}
export const verifyLiveCanonicalProof = createLiveCanonicalBridge();
export const callLiveCanonical = createLiveCanonicalTransport();
