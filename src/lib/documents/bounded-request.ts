import { DocumentReadError } from "./document-read-error";

/** Bound input before JSON/multipart parsing allocates the complete body. */
export async function readDocumentRequest(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    throw new DocumentReadError("REQUEST_TOO_LARGE", "Requête documentaire trop volumineuse.", 413);
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let expired = false;
  const timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 15_000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (expired) throw new DocumentReadError("REQUEST_TIMEOUT", "Le téléversement a dépassé le délai autorisé.", 408);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new DocumentReadError("REQUEST_TOO_LARGE", "Requête documentaire trop volumineuse.", 413);
      chunks.push(value);
    }
    const content = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.byteLength; }
    return content;
  } finally {
    clearTimeout(timer);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
