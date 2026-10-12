import { RegistryError } from "./registry";
import { isSameOriginRequest } from "@/lib/auth/session-request-security";
import { readDocumentRequest } from "@/lib/documents/bounded-request";
import { DocumentReadError } from "@/lib/documents/document-read-error";

export async function registryBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";",1)[0].trim() !== "application/json") throw new RegistryError(415, "JSON_REQUIRED");
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(await readDocumentRequest(request, 16_384)));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RegistryError(400, "INVALID_REGISTRY_REQUEST");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RegistryError) throw error;
    if (error instanceof DocumentReadError) throw new RegistryError(error.status, error.code);
    throw new RegistryError(400, "INVALID_REGISTRY_REQUEST");
  }
}
export function fields(body: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new RegistryError(400, "UNEXPECTED_REGISTRY_FIELD");
}
export function sameOrigin(request: Request): void {
  if (!isSameOriginRequest(request.headers.get("origin"), process.env.CLARA_AUTH_APP_ORIGIN))
    throw new RegistryError(403, "SAME_ORIGIN_REQUIRED");
}
export function registryFailure(error: unknown): Response {
  const failure = error instanceof RegistryError ? error : new RegistryError(503, "REGISTRY_UNAVAILABLE");
  return Response.json({ success: false, code: failure.code }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
}
export function registrySuccess(data: unknown): Response {
  return Response.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
}
