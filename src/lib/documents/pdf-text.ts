import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { DocumentReadError, MAX_PDF_BYTES, checkDocumentText } from "./document-read-error";

const errors: Record<string, [string, number]> = {
  PDF_TOO_LARGE: ["PDF trop volumineux (10 Mo maximum).", 413],
  PDF_TOO_MANY_PAGES: ["PDF trop long (100 pages maximum).", 413],
  DOCUMENT_TOO_LONG: ["Document trop long pour Clara (200 000 caractères maximum).", 413],
  PDF_NO_TEXT: ["Ce PDF ne contient aucun texte extractible. Aucun OCR n’est effectué ; le document original reste disponible.", 422],
  PDF_ENCRYPTED: ["Ce PDF est protégé par un mot de passe. Fournissez une copie déchiffrée pour lire son texte.", 422],
  PDF_INVALID: ["Ce PDF est invalide ou corrompu. Le document original n’a pas été modifié.", 422],
  PDF_RESOURCE_LIMIT: ["La lecture du PDF a dépassé les ressources ou le temps autorisés. Essayez un document plus court.", 422],
  PDF_BUSY: ["Deux PDF sont déjà en cours de lecture. Réessayez dans quelques instants.", 503],
};
let active = 0;
function pdfError(code: string): DocumentReadError {
  const [message, status] = errors[code] ?? errors.PDF_INVALID;
  return new DocumentReadError(code, message, status);
}

export async function extractPdfText(content: Uint8Array): Promise<string> {
  if (content.byteLength > MAX_PDF_BYTES) throw pdfError("PDF_TOO_LARGE");
  if (active >= 2) throw pdfError("PDF_BUSY");
  active++;
  try {
    return await new Promise<string>((accept, reject) => {
      const child = execFile(process.execPath, ["--max-old-space-size=192", resolve(process.cwd(), "src/lib/documents/pdf-text-worker.mjs")], {
        timeout: 15_000, killSignal: "SIGKILL", maxBuffer: 2 * 1024 * 1024,
        // The parser receives document bytes only, never application credentials.
        env: { PATH: process.env.PATH, NODE_ENV: "production" },
      }, (error, stdout) => {
        if (error) { reject(pdfError("PDF_RESOURCE_LIMIT")); return; }
        try {
          const result = JSON.parse(stdout) as { text?: unknown; code?: string };
          if (result.code) throw pdfError(result.code);
          if (typeof result.text !== "string" || !result.text.trim()) throw pdfError("PDF_NO_TEXT");
          accept(checkDocumentText(result.text));
        } catch (caught) { reject(caught instanceof DocumentReadError ? caught : pdfError("PDF_INVALID")); }
      });
      child.stdin?.on("error", () => {});
      child.stdin?.end(content);
    });
  } finally { active--; }
}
