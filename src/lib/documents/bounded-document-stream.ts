import type { Readable } from "node:stream";
import { DocumentReadError } from "./document-read-error";

export async function readDocumentStream(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  const timer = setTimeout(() => stream.destroy(new DocumentReadError("DOCUMENT_TIMEOUT", "Le téléchargement du document a dépassé le délai autorisé.", 504)), 15_000);
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxBytes) throw new DocumentReadError("DOCUMENT_TOO_LARGE", `Document trop volumineux (${maxBytes / 1024 / 1024} Mo maximum).`, 413);
      chunks.push(buffer);
    }
    return Buffer.concat(chunks, bytes);
  } finally {
    clearTimeout(timer);
    stream.destroy();
  }
}
