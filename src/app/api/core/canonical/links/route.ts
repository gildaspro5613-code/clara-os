import { canonicalArchiveAuthority } from "@/lib/canonical/archive-authority";
import { authenticateExternalProduct } from "@/lib/external-capabilities/config";
import { canonicalRegistry, opaque, RegistryError } from "@/lib/canonical/registry";
import { fields, registryBody, registryFailure, registrySuccess } from "@/lib/canonical/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Product credentials can propose evidence, never approve an account/project. */
export async function POST(request: Request) {
  try {
    const product = authenticateExternalProduct("clara-live", request.headers.get("authorization"));
    if (!product || request.headers.get("x-clara-product") !== "clara-live") throw new RegistryError(401, "PRODUCT_AUTHENTICATION_REQUIRED");
    if (!product.capabilities.includes("canonical-links:v1")) throw new RegistryError(403, "CANONICAL_LINK_CAPABILITY_REQUIRED");
    const body = await registryBody(request);
    if (body.action === "redeem") {
      fields(body, ["action", "ticket"]);
      return registrySuccess(await canonicalArchiveAuthority.redeem(product.workspaceId, body.ticket));
    }
    if (typeof body.challenge !== "string") throw new RegistryError(400, "LINK_CHALLENGE_REQUIRED");
    if (body.action === "inspect") {
      fields(body, ["action","challenge"]);
      return registrySuccess(await canonicalRegistry.pending(product.workspaceId, "inspect", body.challenge, {}));
    }
    if (body.action !== "propose" || (body.kind !== "identity" && body.kind !== "project")) throw new RegistryError(400, "INVALID_LINK_PROPOSAL");
    fields(body, ["action","challenge","kind","proofId","liveUserId","liveProjectId"]);
    const payload = { kind: body.kind, proofId: opaque(body.proofId), liveUserId: opaque(body.liveUserId),
      liveProjectId: body.kind === "project" ? opaque(body.liveProjectId) : null };
    if (body.kind === "identity" && body.liveProjectId !== null && body.liveProjectId !== undefined) throw new RegistryError(400, "INVALID_LINK_PROPOSAL");
    return registrySuccess(await canonicalRegistry.pending(product.workspaceId, "propose", body.challenge, payload));
  } catch (error) { return registryFailure(error); }
}
